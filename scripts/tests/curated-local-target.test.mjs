import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
    assertEnonicCliAvailable,
    assertLocalTargetConfiguration,
    assertLocalTargetProcess,
    assertLocalUrl,
    assertSandboxName,
    getLocalCliEnvironment,
    getLocalProcessEnvironment,
    LOCAL_IMPORT_SERVICE_URL,
    LOCAL_MANAGEMENT_URL,
    runLocalXpCommand,
    verifyLocalImportTarget,
} from '../lib/curated-local-target.mjs';

const fixture = (t) => {
    const homeDirectory = mkdtempSync(join(tmpdir(), 'curated-local-target-'));
    t.after(() => rmSync(homeDirectory, { recursive: true, force: true }));
    const sandboxPath = join(homeDirectory, '.enonic/sandboxes/target');
    mkdirSync(join(sandboxPath, 'home/config'), { recursive: true });
    writeFileSync(join(homeDirectory, '.enonic/.enonic'), 'running = "target"\n');
    writeFileSync(
        join(sandboxPath, 'home/config/no.nav.navno.cfg'),
        'env=localhost\ncuratedImportEnabled=true\nserviceSecret=dummyToken\n'
    );
    const xpHome = realpathSync(join(sandboxPath, 'home'));
    writeFileSync(
        join(sandboxPath, 'home/config/com.enonic.xp.cluster.cfg'),
        'cluster.enabled=false\n'
    );
    const runCommand = (command, args) => {
        if (command === 'lsof') return '4242\n';
        if (args.includes('comm=')) return '/local/jdk/bin/java\n';
        return `/local/jdk/bin/java -Dxp.home=${xpHome} -jar /local/xp.jar`;
    };
    return { homeDirectory, sandboxPath, xpHome, runCommand };
};

test('requires exact local endpoints and non-traversing sandbox names', () => {
    assertLocalUrl(LOCAL_MANAGEMENT_URL, LOCAL_MANAGEMENT_URL);
    for (const url of [
        'https://prod.example',
        'http://localhost:4848@prod.example',
        `${LOCAL_MANAGEMENT_URL}/system/load`,
    ]) {
        assert.throws(() => assertLocalUrl(url, LOCAL_MANAGEMENT_URL), /require/);
    }
    for (const name of ['', '.', '..', '../target', 'a/b']) {
        assert.throws(() => assertSandboxName(name), /sandbox name/);
    }
    assertSandboxName('curated_e2e');
});

test('strips inherited source credentials, remote settings and proxies', () => {
    const environment = {
        PATH: '/bin',
        ENONIC_CLI_REMOTE_URL: 'https://prod.example',
        ENONIC_CLI_REMOTE_USER: 'source-user',
        ENONIC_CLI_REMOTE_PASS: 'source-password',
        ENONIC_AUTH: 'source:password',
        XP_HOME: '/production/home',
        JAVA_TOOL_OPTIONS: '-Dcluster.enabled=true',
        GITHUB_TOKEN: 'synthetic-token',
        HTTP_PROXY: 'http://proxy.example',
        https_proxy: 'http://proxy.example',
    };
    assert.deepEqual(getLocalProcessEnvironment(environment), { PATH: '/bin' });
    const local = getLocalCliEnvironment('su:target:password', environment);
    assert.equal(local.ENONIC_CLI_REMOTE_URL, LOCAL_MANAGEMENT_URL);
    assert.equal(local.ENONIC_CLI_REMOTE_USER, 'su');
    assert.equal(local.ENONIC_CLI_REMOTE_PASS, 'target:password');
    assert.equal(local.HTTP_PROXY, undefined);
});

test('accepts one local JVM owning both ports with the selected XP home', (t) => {
    const target = fixture(t);
    assert.equal(assertLocalTargetProcess('target', target), target.sandboxPath);
});

test('rejects split listeners, tunnels, another XP home and duplicate home options', (t) => {
    const target = fixture(t);
    const invalidCommands = [
        (command, args) =>
            command === 'lsof' && args.includes('-iTCP:4848')
                ? '9999\n'
                : target.runCommand(command, args),
        (command, args) =>
            args.includes('comm=') ? '/usr/bin/ssh' : target.runCommand(command, args),
        (command, args) =>
            args.includes('args=')
                ? 'java -Dxp.home=/another/home'
                : target.runCommand(command, args),
        (command, args) =>
            args.includes('args=')
                ? `${target.runCommand(command, args)} -Dxp.home=/another/home`
                : target.runCommand(command, args),
    ];
    for (const runCommand of invalidCommands) {
        assert.throws(
            () => assertLocalTargetProcess('target', { ...target, runCommand }),
            /local XP|target listeners/
        );
    }
});

test('rejects production-connected or not-explicitly-enabled target configuration', (t) => {
    const target = fixture(t);
    for (const config of [
        'env=p\ncuratedImportEnabled=true\nserviceSecret=dummyToken',
        'env=localhost\nserviceSecret=dummyToken',
        'env=localhost\ncuratedImportEnabled=true\nserviceSecret=not-local',
        'env=localhost\ncuratedImportEnabled=true\nserviceSecret=dummyToken\nsearchApiKey=synthetic',
    ]) {
        writeFileSync(join(target.sandboxPath, 'home/config/no.nav.navno.cfg'), config);
        assert.throws(() => assertLocalTargetConfiguration(target.sandboxPath), /Target must/);
    }
});

test('verifies the target before mutations and keeps authentication out of arguments', () => {
    let verified = false;
    let cliHome;
    runLocalXpCommand(['app', 'install', '--url', 'https://example.test/app.jar'], {
        sandbox: 'target',
        auth: 'su:synthetic-secret',
        verifyTarget: () => {
            verified = true;
        },
        runCommand: (command, args, options) => {
            assert.equal(verified, true);
            assert.equal(command, 'enonic');
            assert.equal(args.includes('--auth'), false);
            assert.equal(options.env.ENONIC_CLI_REMOTE_URL, LOCAL_MANAGEMENT_URL);
            cliHome = options.env.ENONIC_CLI_HOME_PATH;
            assert.equal(existsSync(cliHome), true);
            assert.equal(existsSync(join(cliHome, '.enonic/.enonic')), false);
            return 'ok';
        },
    });
    assert.equal(existsSync(cliHome), false);
    assert.throws(
        () =>
            runLocalXpCommand(['import'], {
                sandbox: 'target',
                auth: 'su:synthetic-secret',
                verifyTarget: () => {},
                runCommand: () => {
                    throw new Error('Command failed: --auth su:synthetic-secret');
                },
            }),
        (error) =>
            !error.message.includes('synthetic-secret') &&
            error.message.includes('operation failed')
    );
});

test('isolates cached CLI sessions per command and removes them after failures', () => {
    const homes = [];
    for (let index = 0; index < 2; index += 1) {
        assert.throws(
            () =>
                runLocalXpCommand(['app', 'install'], {
                    sandbox: 'target',
                    auth: 'su:synthetic-secret',
                    verifyTarget: () => {},
                    runCommand: (_command, _args, { env }) => {
                        const home = env.ENONIC_CLI_HOME_PATH;
                        homes.push(home);
                        assert.equal(existsSync(join(home, '.enonic/.enonic')), false);
                        mkdirSync(join(home, '.enonic'));
                        writeFileSync(join(home, '.enonic/.enonic'), 'SessionID = "synthetic"');
                        throw Object.assign(new Error('synthetic-secret'), {
                            stderr: Buffer.from('User session is not valid. synthetic-secret'),
                        });
                    },
                }),
            (error) =>
                error.message.includes('authentication rejected') &&
                !error.message.includes('synthetic-secret')
        );
        assert.equal(existsSync(homes[index]), false);
    }
    assert.notEqual(homes[0], homes[1]);
});

test('requires authenticated live localhost opt-in before import', async () => {
    const options = {
        sandbox: 'target',
        auth: 'su:synthetic',
        verifyTarget: () => {},
        getSessionCookie: async () => 'synthetic-cookie',
        fetchRequest: async (url, request) => {
            assert.equal(url, LOCAL_IMPORT_SERVICE_URL);
            assert.equal(request.redirect, 'error');
            return {
                ok: true,
                json: async () => ({
                    environment: 'localhost',
                    importEnabled: true,
                    importFormatVersion: 2,
                }),
            };
        },
    };
    assert.equal(await verifyLocalImportTarget(options), 'synthetic-cookie');
    await assert.rejects(
        verifyLocalImportTarget({ ...options, requireImportMode: true }),
        /content listeners paused/
    );
    assert.equal(
        await verifyLocalImportTarget({
            ...options,
            requireImportMode: true,
            fetchRequest: async () => ({
                ok: true,
                json: async () => ({
                    environment: 'localhost',
                    importEnabled: true,
                    importFormatVersion: 2,
                    importInProgress: true,
                }),
            }),
        }),
        'synthetic-cookie'
    );
    await assert.rejects(
        verifyLocalImportTarget({
            ...options,
            fetchRequest: async () => ({ ok: false, json: async () => ({}) }),
        }),
        /has not enabled/
    );
    await assert.rejects(
        verifyLocalImportTarget({
            ...options,
            fetchRequest: async () => ({
                ok: true,
                json: async () => ({ environment: 'localhost', importEnabled: true }),
            }),
        }),
        /compatible.*format 2/
    );
});

test('rejects target clustering before any target mutation', (t) => {
    const target = fixture(t);
    writeFileSync(
        join(target.sandboxPath, 'home/config/com.enonic.xp.cluster.cfg'),
        'cluster.enabled=true\ndiscovery.unicast.hosts=production.example\n'
    );
    assert.throws(
        () => assertLocalTargetConfiguration(target.sandboxPath),
        /clustering configuration/
    );
});

test('reports a clear error when the Enonic CLI executable is missing', () => {
    const runCommand = () => {
        throw Object.assign(new Error('spawn enonic ENOENT'), { code: 'ENOENT' });
    };
    assert.throws(() => assertEnonicCliAvailable(runCommand), /Enonic CLI not found/);
});

test('surfaces other Enonic CLI invocation failures without hiding the cause', () => {
    const runCommand = () => {
        throw new Error('boom');
    };
    assert.throws(
        () => assertEnonicCliAvailable(runCommand),
        /Could not determine the installed Enonic CLI version/
    );
});

test('warns but does not stop on an unexpected Enonic CLI major version', () => {
    const runCommand = () => 'enonic version 3.9.0\n';
    const warnings = [];
    assertEnonicCliAvailable(runCommand, { warn: (message) => warnings.push(message) });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /expects major version 4\.x/);
});

test('does not warn when the installed Enonic CLI matches the expected major version', () => {
    const runCommand = () => 'enonic version 4.1.2\n';
    const warnings = [];
    assertEnonicCliAvailable(runCommand, { warn: (message) => warnings.push(message) });
    assert.equal(warnings.length, 0);
});

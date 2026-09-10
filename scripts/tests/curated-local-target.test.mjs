import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
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
        CURATED_SOURCE_AUTH: 'source:password',
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
    assert.equal(local.CURATED_SOURCE_AUTH, undefined);
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
            return 'ok';
        },
    });
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

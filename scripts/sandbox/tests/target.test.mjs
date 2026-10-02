import assert from 'node:assert/strict';
import console from 'node:console';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import {
    assertEnonicCliAvailable,
    assertLocalTargetConfiguration,
    assertLocalTargetProcess,
    assertLocalUrl,
    assertSandboxName,
    findSameMinorVersion,
    getLocalCliEnvironment,
    getLocalProcessEnvironment,
    installCuratedApplications,
    LOCAL_IMPORT_SERVICE_URL,
    LOCAL_MANAGEMENT_URL,
    prepareCuratedTarget,
    runLocalXpCommand,
    setCuratedImportMode,
    verifyLocalImportTarget,
    waitForManagementApi,
} from '../lib/target.mjs';

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
    for (const name of ['', '.', '..', '../target', 'a/b', 'curated-dev2', 'v1.0', undefined]) {
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

test('allows generic local sandbox operations without curated import enabled', (t) => {
    const target = fixture(t);
    writeFileSync(
        join(target.sandboxPath, 'home/config/no.nav.navno.cfg'),
        'env=localhost\nserviceSecret=dummyToken\n'
    );

    assert.equal(
        assertLocalTargetProcess('target', {
            ...target,
            requireCuratedImport: false,
        }),
        target.sandboxPath
    );
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

const writeFile = (path, content = '') => {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content);
};

const LOCAL_CONFIG = 'env=localhost\ncuratedImportEnabled=true\nserviceSecret=dummyToken\n';

const installResult = (key, version) =>
    JSON.stringify({
        Failure: '',
        ApplicationInstalledJson: { Application: { Key: key, Version: version } },
    });

test('enables import mode only for a safe local target and removes the flag on cleanup', (t) => {
    const root = mkdtempSync(join(tmpdir(), 'curated-import-mode-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    writeFile(join(root, 'home/config/no.nav.navno.cfg'), LOCAL_CONFIG);
    writeFile(join(root, 'home/config/com.enonic.xp.cluster.cfg'), 'cluster.enabled=false\n');
    setCuratedImportMode(root, true);
    setCuratedImportMode(root, true);
    assert.equal(
        readFileSync(join(root, 'home/config/no.nav.navno.cfg'), 'utf8'),
        `${LOCAL_CONFIG}curatedImportInProgress=true\n`
    );
    setCuratedImportMode(root, false);
    assert.equal(readFileSync(join(root, 'home/config/no.nav.navno.cfg'), 'utf8'), LOCAL_CONFIG);
    writeFile(join(root, 'home/config/no.nav.navno.cfg'), LOCAL_CONFIG.replace('localhost', 'p'));
    assert.throws(() => setCuratedImportMode(root, true), /Target must/);
});

test('waits for the management API to accept connections', () => {
    const commands = [];
    waitForManagementApi((command, args, options) => commands.push({ command, args, options }));

    assert.deepEqual(
        commands.map(({ command, args, options }) => ({
            command,
            args,
            options: { stdio: options.stdio },
        })),
        [
            {
                command: 'curl',
                args: [
                    '--silent',
                    '--output',
                    '/dev/null',
                    '--retry',
                    '60',
                    '--retry-connrefused',
                    '--retry-delay',
                    '1',
                    'http://localhost:4848/',
                ],
                options: { stdio: 'inherit' },
            },
        ]
    );
});

test('uses exceptional Maven coordinates and tolerates an unavailable optional app', () => {
    const commands = [];
    const applications = [
        { key: 'com.enonic.app.audit.log', version: '1.2.1', required: true },
        { key: 'no.item.partfinder', version: '1.2.0', required: true },
        { key: 'systems.rcd.enonic.datatoolbox', version: '5.2.1', required: true },
        { key: 'com.enonic.app.contentstudio.plus', version: '1.9.0', required: false },
    ];
    installCuratedApplications({
        applications,
        auth: 'su:password',
        sandbox: 'target',
        verifyTarget: () => {},
        runCommand(_command, args) {
            commands.push(args);
            const { key, version } = applications[commands.length - 1];
            return args[3].includes('contentstudio.plus')
                ? '{"Failure":"not available"}'
                : installResult(key, version);
        },
    });

    assert.match(commands[0][3], /com\/enonic\/app\/audit-log\/1\.2\.1\/audit-log-1\.2\.1\.jar$/);
    assert.match(
        commands[1][3],
        /repo\.itemtest\.no\/releases\/no\/item\/xp-part-finder\/1\.2\.0\/xp-part-finder-1\.2\.0\.jar$/
    );
    assert.match(
        commands[2][3],
        /github\.com\/GlennRicaud\/maven\/raw\/main\/systems\/rcd\/enonic\/datatoolbox\/5\.2\.1\/datatoolbox-5\.2\.1\.jar$/
    );
    assert.match(
        commands[3][3],
        /com\/enonic\/app\/contentstudio\.plus\/1\.9\.0\/contentstudio\.plus-1\.9\.0\.jar$/
    );
});

test('requires the installer to confirm the exact application key and pinned version', () => {
    const key = 'com.enonic.app.contentstudio';
    const options = {
        applications: [{ key, version: '5.4.12', required: true }],
        auth: 'su:synthetic',
        sandbox: 'target',
        verifyTarget: () => {},
    };
    installCuratedApplications({
        ...options,
        runCommand: () => `Installing application\n${installResult(key, '5.4.12')}`,
    });
    for (const output of [
        installResult(key, '5.4.14'),
        installResult('another.application', '5.4.12'),
        '{"Failure":""}',
    ]) {
        assert.throws(
            () => installCuratedApplications({ ...options, runCommand: () => output }),
            /Installation did not confirm com.enonic.app.contentstudio 5.4.12/
        );
    }
    assert.throws(
        () => installCuratedApplications({ ...options, runCommand: () => 'invalid response' }),
        /Could not install required application/
    );
});

const versionList = (...versions) =>
    `<metadata><versioning><versions>${versions.map((version) => `<version>${version}</version>`).join('')}</versions></versioning></metadata>`;

test('finds the newest other patch of the same minor version', () => {
    const published = ['1.2.0', '1.2.3', '1.2.10', '1.3.0', '2.2.11', '1.2.11-SNAPSHOT'];
    assert.equal(findSameMinorVersion(published, '1.2.3'), '1.2.10');
    assert.equal(findSameMinorVersion(['1.2.3', '1.3.0'], '1.2.3'), null);
    assert.equal(findSameMinorVersion(published, 'not-a-version'), null);
});

test('installs another patch of the same minor version with a warning when the exact version fails', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    t.mock.method(console, 'log', () => {});
    t.mock.method(process.stdout, 'write', () => true);
    const key = 'no.item.partfinder';
    const requests = [];
    installCuratedApplications({
        applications: [{ key, version: '1.2.0', required: true }],
        auth: 'su:synthetic',
        sandbox: 'target',
        verifyTarget: () => {},
        runCommand: (command, args) => {
            requests.push([command, args.at(-1)]);
            if (command === 'curl') {
                return versionList('1.1.9', '1.2.0', '1.2.2', '1.3.0');
            }
            const url = args[args.indexOf('--url') + 1];
            return url.includes('/1.2.2/')
                ? installResult(key, '1.2.2')
                : '{"Failure":"not found"}';
        },
    });
    assert.match(
        requests.find(([command]) => command === 'curl')[1],
        /\/no\/item\/xp-part-finder\/maven-metadata\.xml$/
    );
    assert.match(
        warn.mock.calls[0].arguments[0],
        /no\.item\.partfinder: installed 1\.2\.2, source has 1\.2\.0/
    );
});

test('skips an optional application with a warning when no version can be installed', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    t.mock.method(console, 'log', () => {});
    t.mock.method(process.stdout, 'write', () => true);
    installCuratedApplications({
        applications: [{ key: 'com.enonic.app.contentstudio', version: '5.3.2', required: false }],
        auth: 'su:synthetic',
        sandbox: 'target',
        verifyTarget: () => {},
        runCommand: (command) =>
            command === 'curl' ? versionList('5.3.2', '5.4.0') : '{"Failure":"offline"}',
    });
    assert.match(
        warn.mock.calls[0].arguments[0],
        /com\.enonic\.app\.contentstudio: not installed, source has 5\.3\.2 \(offline; fallback: No other 5\.3\.x version was found\)/
    );
});

test('does not start an optional application which is stopped in the source', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    t.mock.method(console, 'log', () => {});
    let commands = 0;
    installCuratedApplications({
        applications: [
            { key: 'com.enonic.app.xpdoctor', version: '2.3.0', required: false, started: false },
        ],
        auth: 'su:synthetic',
        sandbox: 'target',
        verifyTarget: () => {},
        runCommand: () => {
            commands += 1;
        },
    });
    assert.equal(commands, 0);
    assert.match(
        warn.mock.calls[0].arguments[0],
        /com\.enonic\.app\.xpdoctor: not installed, stopped in the source/
    );
});

test('creates and prepares a missing target sandbox', (t) => {
    const root = mkdtempSync(join(tmpdir(), 'curated-target-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const homeDirectory = join(root, 'home');
    const repositoryRoot = join(root, 'repository');
    const sandboxPath = join(homeDirectory, '.enonic/sandboxes/target');
    const distro = 'enonic-xp-mac-arm64-sdk-7.16.6';
    const commands = [];
    [
        'config/com.enonic.xp.content.cfg',
        'config/localhost/no.nav.navno.cfg',
        'config/localhost/com.enonic.xp.web.vhost.cfg',
        'config/com.enonic.app.contentstudio.cfg',
    ].forEach((path) =>
        writeFile(
            join(repositoryRoot, path),
            path.endsWith('/no.nav.navno.cfg') ? LOCAL_CONFIG : path
        )
    );
    writeFile(join(repositoryRoot, 'build/libs/navno.jar'), 'app');

    const result = prepareCuratedTarget({
        sandbox: 'target',
        xpVersion: '7.16.6',
        appVersion: '2.3.4-test',
        contentStudioVersion: '5.3.2',
        applications: [
            { key: 'com.enonic.app.contentstudio', version: '5.3.2', required: true },
            { key: 'com.enonic.app.xpdoctor', version: '2.3.0', required: false },
            { key: 'no.nav.navno', version: '2.3.4-test' },
        ],
        suPassword: 'temporary-password',
        repositoryRoot,
        homeDirectory,
        verifyTarget: () => {},
        runCommand(command, args, options) {
            commands.push({ command, args, options });
            if (args[0] === 'sandbox' && args[1] === 'start') {
                assert.match(
                    readFileSync(join(sandboxPath, 'home/config/no.nav.navno.cfg'), 'utf8'),
                    /^curatedImportInProgress=true$/m
                );
            }
            if (args[0] === 'sandbox' && args[1] === 'create') {
                writeFile(join(sandboxPath, '.enonic'), `distro = "${distro}"\n`);
                writeFile(
                    join(sandboxPath, 'home/config/system.properties'),
                    'existing.property=true\n'
                );
                writeFile(join(sandboxPath, 'home/deploy/README.txt'), 'placeholder');
            }
            if (args[0] === 'app') {
                return args[3].includes('contentstudio')
                    ? installResult('com.enonic.app.contentstudio', '5.3.2')
                    : installResult('com.enonic.app.xpdoctor', '2.3.0');
            }
        },
    });

    assert.equal(result.created, true);
    assert.deepEqual(commands[0].args, [
        'sandbox',
        'create',
        'target',
        '--version',
        '7.16.6',
        '--skip-template',
        '--force',
        '--skip-start',
    ]);
    assert.deepEqual(commands[1].args, [
        'build',
        '--quiet',
        '-PcuratedImportLocal=true',
        '-PxpVersion=7.16.6',
        '-Pversion=2.3.4-test',
    ]);
    assert.equal(
        commands[1].options.env.JAVA_HOME,
        join(homeDirectory, '.enonic/distributions', distro, 'jdk')
    );
    assert.deepEqual(commands[2].args, ['sandbox', 'start', 'target', '--detach', '--force']);
    assert.deepEqual(commands[3].args, [
        '--silent',
        '--output',
        '/dev/null',
        '--retry',
        '60',
        '--retry-connrefused',
        '--retry-delay',
        '1',
        'http://localhost:4848/',
    ]);
    assert.deepEqual(commands[4].args, [
        'app',
        'install',
        '--url',
        'https://repo.enonic.com/repository/public/com/enonic/app/contentstudio/5.3.2/contentstudio-5.3.2.jar',
        '--force',
    ]);
    assert.equal(commands[4].options.env.ENONIC_CLI_REMOTE_URL, 'http://localhost:4848');
    assert.equal(commands[4].options.env.ENONIC_CLI_REMOTE_USER, 'su');
    assert.equal(commands[4].options.env.ENONIC_CLI_REMOTE_PASS, 'temporary-password');
    assert.deepEqual(commands[5].args, [
        'app',
        'install',
        '--url',
        'https://repo.enonic.com/repository/public/com/enonic/app/xpdoctor/2.3.0/xpdoctor-2.3.0.jar',
        '--force',
    ]);
    assert.equal(commands[5].options.env.ENONIC_CLI_REMOTE_URL, 'http://localhost:4848');
    assert.equal(
        readFileSync(join(sandboxPath, 'home/config/system.properties'), 'utf8'),
        'existing.property=true\nxp.suPassword=temporary-password\n'
    );
    assert.equal(
        readFileSync(
            join(sandboxPath, 'home/config/com.enonic.xp.app.standardidprovider.cfg'),
            'utf8'
        ),
        'loginWithoutUser=false\n'
    );
    assert.equal(readFileSync(join(sandboxPath, 'home/deploy/navno.jar'), 'utf8'), 'app');
});

test('rejects an existing target with a different XP version', (t) => {
    const root = mkdtempSync(join(tmpdir(), 'curated-target-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const sandboxPath = join(root, '.enonic/sandboxes/target');
    writeFile(join(sandboxPath, '.enonic'), 'distro = "enonic-xp-mac-arm64-sdk-7.15.0"\n');
    writeFile(
        join(sandboxPath, 'home/config/no.nav.navno.cfg'),
        'env=localhost\ncuratedImportEnabled=true\nserviceSecret=dummyToken\n'
    );
    writeFile(
        join(sandboxPath, 'home/config/com.enonic.xp.cluster.cfg'),
        'cluster.enabled=false\n'
    );

    assert.throws(
        () =>
            prepareCuratedTarget({
                sandbox: 'target',
                xpVersion: '7.16.6',
                appVersion: '2.3.4-test',
                contentStudioVersion: '5.3.2',
                suPassword: 'temporary-password',
                homeDirectory: root,
            }),
        /uses XP 7\.15\.0; curated source uses XP 7\.16\.6/
    );
});

test('keeps the SU password and explains recovery when provisioning fails', (t) => {
    const root = mkdtempSync(join(tmpdir(), 'curated-target-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const repositoryRoot = join(root, 'repository');
    const sandboxPath = join(root, '.enonic/sandboxes/target');
    [
        'config/com.enonic.xp.content.cfg',
        'config/localhost/no.nav.navno.cfg',
        'config/localhost/com.enonic.xp.web.vhost.cfg',
        'config/com.enonic.app.contentstudio.cfg',
    ].forEach((path) =>
        writeFile(
            join(repositoryRoot, path),
            path.endsWith('/no.nav.navno.cfg') ? LOCAL_CONFIG : path
        )
    );

    assert.throws(
        () =>
            prepareCuratedTarget({
                sandbox: 'target',
                xpVersion: '7.16.6',
                appVersion: '2.3.4-test',
                contentStudioVersion: '5.3.2',
                suPassword: 'temporary-password',
                repositoryRoot,
                homeDirectory: root,
                runCommand(_command, args) {
                    if (args[0] === 'sandbox' && args[1] === 'create') {
                        writeFile(
                            join(sandboxPath, '.enonic'),
                            'distro = "enonic-xp-mac-arm64-sdk-7.16.6"\n'
                        );
                        writeFile(
                            join(sandboxPath, 'home/config/system.properties'),
                            'existing.property=true\n'
                        );
                        return;
                    }
                    throw new Error('build failed');
                },
            }),
        /Retry with --force and the same SU password, or delete it with `enonic sandbox delete target`/
    );
    assert.equal(
        readFileSync(join(sandboxPath, 'home/config/system.properties'), 'utf8'),
        'existing.property=true\nxp.suPassword=temporary-password\n'
    );
    assert.doesNotMatch(
        readFileSync(join(sandboxPath, 'home/config/no.nav.navno.cfg'), 'utf8'),
        /curatedImportInProgress/
    );
});

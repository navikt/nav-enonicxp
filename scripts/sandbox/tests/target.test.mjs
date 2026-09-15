import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
    installCuratedApplications,
    prepareCuratedTarget,
    removeTemporarySuPassword,
    setCuratedImportMode,
    waitForManagementApi,
} from '../lib/target.mjs';

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

test('does not start an optional application which is stopped in the source', () => {
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
});

test('creates and prepares a missing target sandbox', () => {
    const root = mkdtempSync(join(tmpdir(), 'curated-target-'));
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

    removeTemporarySuPassword(sandboxPath);
    assert.equal(
        readFileSync(join(sandboxPath, 'home/config/system.properties'), 'utf8'),
        'existing.property=true\n'
    );
});

test('rejects an existing target with a different XP version', () => {
    const root = mkdtempSync(join(tmpdir(), 'curated-target-'));
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

test('removes the temporary SU password when provisioning fails', () => {
    const root = mkdtempSync(join(tmpdir(), 'curated-target-'));
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

    assert.throws(() =>
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
        })
    );
    assert.equal(
        readFileSync(join(sandboxPath, 'home/config/system.properties'), 'utf8'),
        'existing.property=true\n'
    );
    assert.doesNotMatch(
        readFileSync(join(sandboxPath, 'home/config/no.nav.navno.cfg'), 'utf8'),
        /curatedImportInProgress/
    );
});

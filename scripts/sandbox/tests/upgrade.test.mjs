import assert from 'node:assert/strict';
import console from 'node:console';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { getUpgradeOptions, upgradeSandbox } from '../upgrade.mjs';

const fixture = (t, { sandboxVersion = '8.0.4', running = true, suPassword = true } = {}) => {
    const root = mkdtempSync(join(tmpdir(), 'sandbox-upgrade-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    t.mock.method(console, 'log', () => {});
    const homeDirectory = join(root, 'home');
    const repositoryRoot = join(root, 'repository');
    const sandboxPath = join(homeDirectory, '.enonic/sandboxes/navno_xp8');
    mkdirSync(join(sandboxPath, 'home/config'), { recursive: true });
    writeFileSync(join(sandboxPath, '.enonic'), `distro = "enonic-xp-mac-sdk-${sandboxVersion}"\n`);
    if (suPassword) {
        writeFileSync(
            join(sandboxPath, 'home/config/system.properties'),
            'xp.suPassword={sha512}ab\n'
        );
    }
    if (running) {
        writeFileSync(join(homeDirectory, '.enonic/.enonic'), 'running = "navno_xp8"\n');
    }
    mkdirSync(join(repositoryRoot, 'config/localhost'), { recursive: true });
    writeFileSync(join(repositoryRoot, 'gradle.properties'), 'xpVersion = 8.1.2\n');
    [
        'config/com.enonic.xp.content.cfg',
        'config/localhost/no.nav.navno.cfg',
        'config/localhost/com.enonic.xp.web.vhost.cfg',
        'config/com.enonic.app.contentstudio.cfg',
    ].forEach((path) => writeFileSync(join(repositoryRoot, path), ''));

    const steps = [];
    const dependencies = {
        homeDirectory,
        repositoryRoot,
        assertCli: () => {},
        getAuth: async () => 'su:synthetic-password',
        runCommand: (command, args) => steps.push(`${command} ${args.join(' ')}`),
        deploy: (args) => steps.push(`deploy ${args.join(' ')}`),
        waitForApi: () => steps.push('wait'),
        listApplications: () => [
            { key: 'com.enonic.app.contentstudio', version: '6.0.3', state: 'started' },
        ],
        installApplications: ({ applications, auth }) =>
            steps.push(`install ${applications.map(({ key }) => key).join(', ')} as ${auth}`),
    };
    return { sandboxPath, steps, dependencies };
};

test('parses the sandbox and rejects missing values or unknown flags', () => {
    assert.deepEqual(getUpgradeOptions(['--sandbox', 'navno_xp8']), { sandbox: 'navno_xp8' });
    assert.throws(() => getUpgradeOptions(['--sandbox']), /Invalid argument/);
    assert.throws(() => getUpgradeOptions(['--version', '8.1.2']), /Invalid argument/);
});

test('stops, upgrades, configures, deploys and starts the sandbox, then upgrades its apps', async (t) => {
    const { sandboxPath, steps, dependencies } = fixture(t);
    const result = await upgradeSandbox({ sandbox: 'navno_xp8' }, dependencies);

    assert.deepEqual(steps, [
        'enonic sandbox stop --force',
        'enonic sandbox upgrade navno_xp8 --version 8.1.2 --force',
        'deploy navno_xp8 --skip-start',
        'enonic sandbox start navno_xp8 --detach --force',
        'wait',
        'install com.enonic.app.contentstudio, com.enonic.app.guillotine as su:synthetic-password',
    ]);
    assert.equal(existsSync(join(sandboxPath, 'home/config/no.nav.navno.cfg')), true);
    assert.equal(result.previousVersion, '8.0.4');
    assert.equal(result.xpVersion, '8.1.2');
});

test('skips the XP upgrade and stop when the sandbox is current and stopped', async (t) => {
    const { steps, dependencies } = fixture(t, { sandboxVersion: '8.1.2', running: false });
    await upgradeSandbox({ sandbox: 'navno_xp8' }, dependencies);
    assert.deepEqual(steps.slice(0, 2), [
        'deploy navno_xp8 --skip-start',
        'enonic sandbox start navno_xp8 --detach --force',
    ]);
});

test('refuses older major versions, downgrades and sandboxes without an SU password', async (t) => {
    const cases = [
        [
            { sandboxVersion: '7.16.8' },
            /cannot be upgraded to XP 8\.1\.2 in place.*sandbox:import --source navno_xp8/,
        ],
        [{ sandboxVersion: '8.2.0' }, /newer than the XP 8\.1\.2 .*cannot be downgraded/],
        [
            { suPassword: false },
            /has no SU password.*sandbox:config --sandbox navno_xp8 --set-password/,
        ],
    ];
    for (const [options, message] of cases) {
        const { steps, dependencies } = fixture(t, options);
        let prompted = false;
        await assert.rejects(
            upgradeSandbox(
                { sandbox: 'navno_xp8' },
                {
                    ...dependencies,
                    getAuth: async () => {
                        prompted = true;
                    },
                }
            ),
            message
        );
        assert.deepEqual(steps, []);
        assert.equal(prompted, false);
    }
    await assert.rejects(
        upgradeSandbox({ sandbox: 'missing' }, fixture(t).dependencies),
        /Sandbox missing does not exist/
    );
});

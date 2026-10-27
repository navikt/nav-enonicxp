import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { configureSandbox, getConfigOptions } from '../config.mjs';

const hashed = (password) =>
    `{sha512}${createHash('sha512').update(password, 'utf8').digest('hex')}`;

const createSandbox = () => {
    const home = mkdtempSync(join(tmpdir(), 'sandbox-config-'));
    const sandboxPath = join(home, '.enonic', 'sandboxes', 'target');
    mkdirSync(sandboxPath, { recursive: true });
    writeFileSync(join(sandboxPath, '.enonic'), '');
    return { home, configDirectory: join(sandboxPath, 'home/config') };
};

test('parses the sandbox and the password flag, and rejects a password value or unknown flags', () => {
    assert.deepEqual(getConfigOptions(['--sandbox', 'target', '--set-password']), {
        sandbox: 'target',
        setPassword: true,
    });
    assert.throws(() => getConfigOptions(['--sandbox']), /Invalid argument/);
    assert.throws(() => getConfigOptions(['--password', 'secret']), /Invalid argument/);
});

test('copies only the repo config files, leaving the password alone by default', async () => {
    const { home, configDirectory } = createSandbox();
    try {
        await configureSandbox(
            { sandbox: 'target' },
            { homeDirectory: home, getPassword: () => assert.fail('must not prompt') }
        );
        assert.equal(
            readFileSync(join(configDirectory, 'no.nav.navno.cfg'), 'utf8'),
            readFileSync('config/localhost/no.nav.navno.cfg', 'utf8')
        );
        assert.ok(existsSync(join(configDirectory, 'com.enonic.xp.web.vhost.cfg')));
        assert.ok(existsSync(join(configDirectory, 'com.enonic.xp.content.cfg')));
        assert.ok(existsSync(join(configDirectory, 'com.enonic.app.contentstudio.cfg')));
        assert.equal(existsSync(join(configDirectory, 'com.enonic.xp.cluster.cfg')), false);
        assert.equal(
            existsSync(join(configDirectory, 'com.enonic.xp.app.standardidprovider.cfg')),
            false
        );
        assert.equal(existsSync(join(configDirectory, 'system.properties')), false);
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
});

test('stores the prompted password only with the password flag', async () => {
    const { home, configDirectory } = createSandbox();
    try {
        await configureSandbox(
            { sandbox: 'target', setPassword: true },
            { homeDirectory: home, getPassword: async () => 'synthetic-password' }
        );
        assert.match(
            readFileSync(join(configDirectory, 'system.properties'), 'utf8'),
            new RegExp(`^xp\\.suPassword=\\${hashed('synthetic-password')}$`, 'm')
        );
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
});

test('replaces a forgotten password and keeps other properties', async () => {
    const { home, configDirectory } = createSandbox();
    try {
        mkdirSync(configDirectory, { recursive: true });
        writeFileSync(
            join(configDirectory, 'system.properties'),
            'xp.suPassword=old-password\nxp.name=local\n'
        );
        await configureSandbox(
            { sandbox: 'target', setPassword: true },
            { homeDirectory: home, getPassword: async () => 'new-password' }
        );
        assert.equal(
            readFileSync(join(configDirectory, 'system.properties'), 'utf8'),
            `xp.name=local\nxp.suPassword=${hashed('new-password')}\n`
        );
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
});

test('rejects a missing sandbox before writing anything', async () => {
    const home = mkdtempSync(join(tmpdir(), 'sandbox-config-'));
    try {
        await assert.rejects(
            configureSandbox({ sandbox: 'missing' }, { homeDirectory: home }),
            /does not exist/
        );
        await assert.rejects(configureSandbox({}, { homeDirectory: home }), /Usage/);
        assert.equal(existsSync(resolve(home, '.enonic/sandboxes/missing')), false);
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
});

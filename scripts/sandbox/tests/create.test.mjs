import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createSandbox, getCreateOptions, readRepositoryXpVersion } from '../create.mjs';

// SHA-512 of 'synthetic-password', in the {sha512}<hex> format XP requires for xp.suPassword.
const SYNTHETIC_PASSWORD_HASH =
    '{sha512}d541171f7924e165b7781933e8277f9ad2a1f7f20c8984ffb6ffebf6415eb118feccbdbba10e5e3ecd9fa06ab4762ba7097a44b190c6c3796ff5bc636d8a2c36';

const setup = () => {
    const home = mkdtempSync(join(tmpdir(), 'sandbox-create-'));
    const created = [];
    // Stands in for `enonic sandbox create`, which makes the sandbox directory and metadata.
    const create = ({ sandbox, xpVersion }) => {
        created.push({ sandbox, xpVersion });
        const sandboxPath = join(home, '.enonic', 'sandboxes', sandbox);
        mkdirSync(sandboxPath, { recursive: true });
        writeFileSync(join(sandboxPath, '.enonic'), '');
    };
    const dependencies = {
        homeDirectory: home,
        assertCli: () => {},
        getPassword: async () => 'synthetic-password',
        create,
    };
    const configDirectory = (sandbox) => join(home, '.enonic/sandboxes', sandbox, 'home/config');
    return { home, created, dependencies, configDirectory };
};

test('parses the sandbox and version, and rejects missing values or unknown flags', () => {
    assert.deepEqual(getCreateOptions(['--sandbox', 'navno_xp8', '--version', '8.0.4']), {
        sandbox: 'navno_xp8',
        version: '8.0.4',
    });
    assert.throws(() => getCreateOptions(['--sandbox']), /Invalid argument/);
    assert.throws(() => getCreateOptions(['--version', '--sandbox', 'x']), /Invalid argument/);
    assert.throws(() => getCreateOptions(['--password', 'secret']), /Invalid argument/);
});

test('reads the XP version from gradle.properties', () => {
    const root = mkdtempSync(join(tmpdir(), 'sandbox-create-repo-'));
    try {
        writeFileSync(join(root, 'gradle.properties'), 'group = no.nav\nxpVersion = 8.0.4\n');
        assert.equal(readRepositoryXpVersion(root), '8.0.4');
        writeFileSync(join(root, 'gradle.properties'), 'group = no.nav\n');
        assert.throws(() => readRepositoryXpVersion(root), /Could not read xpVersion/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('creates the sandbox with the repo XP version, config and hashed password', async () => {
    const { home, created, dependencies, configDirectory } = setup();
    try {
        const { xpVersion } = await createSandbox({ sandbox: 'navno_xp8' }, dependencies);
        assert.equal(xpVersion, readRepositoryXpVersion());
        assert.deepEqual(created, [{ sandbox: 'navno_xp8', xpVersion }]);
        assert.equal(
            readFileSync(join(configDirectory('navno_xp8'), 'no.nav.navno.cfg'), 'utf8'),
            readFileSync('config/localhost/no.nav.navno.cfg', 'utf8')
        );
        assert.ok(existsSync(join(configDirectory('navno_xp8'), 'com.enonic.xp.web.vhost.cfg')));
        assert.match(
            readFileSync(join(configDirectory('navno_xp8'), 'system.properties'), 'utf8'),
            new RegExp(`^xp\\.suPassword=\\${SYNTHETIC_PASSWORD_HASH}$`, 'm')
        );
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
});

test('uses an explicit version over the repo version', async () => {
    const { home, created, dependencies } = setup();
    try {
        await createSandbox({ sandbox: 'navno_xp8', version: '8.0.4' }, dependencies);
        assert.deepEqual(created, [{ sandbox: 'navno_xp8', xpVersion: '8.0.4' }]);
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
});

test('refuses an existing sandbox, a bad name or version, before prompting or creating', async () => {
    const { home, created, dependencies } = setup();
    const guarded = {
        ...dependencies,
        getPassword: () => assert.fail('must not prompt'),
    };
    try {
        await dependencies.create({ sandbox: 'existing', xpVersion: '7.16.8' });
        created.length = 0;
        await assert.rejects(
            createSandbox({ sandbox: 'existing' }, guarded),
            /already exists.*sandbox:config --sandbox existing/
        );
        await assert.rejects(createSandbox({ sandbox: 'bad-name' }, guarded), /Invalid sandbox/);
        await assert.rejects(
            createSandbox({ sandbox: 'navno', version: 'latest' }, guarded),
            /Invalid XP version/
        );
        await assert.rejects(createSandbox({}, guarded), /Usage/);
        assert.deepEqual(created, []);
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
});

test('does not create the sandbox when the password prompt fails', async () => {
    const { home, created, dependencies } = setup();
    try {
        await assert.rejects(
            createSandbox(
                { sandbox: 'navno' },
                {
                    ...dependencies,
                    getPassword: async () => {
                        throw new Error('The su passwords did not match');
                    },
                }
            ),
            /did not match/
        );
        assert.deepEqual(created, []);
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
});

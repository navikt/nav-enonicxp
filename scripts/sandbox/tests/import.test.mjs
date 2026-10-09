import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { getImportOptions } from '../import.mjs';

test('full import and refresh require an explicit target even if one is running', () => {
    for (const flags of [[], ['--force']]) {
        assert.throws(
            () => getImportOptions(['--source', 'prod', ...flags], () => 'running-target'),
            /Only page imports default/
        );
        const options = getImportOptions(
            ['--source', 'prod', '--target', 'explicit-target', ...flags],
            () => 'running-target'
        );
        assert.equal(options.target, 'explicit-target');
    }
});

test('page import defaults to the running target but allows explicit overrides', () => {
    const page = 'https://www.nav.no/arbeid';
    const inferred = getImportOptions(['--page', page], () => 'running-target');
    assert.equal(inferred.target, 'running-target');
    assert.equal(inferred.source, 'prod');
    const explicit = getImportOptions(
        ['--page', page, '--target', 'other-target', '--source', 'dev1'],
        () => {
            throw new Error('No default lookup expected');
        }
    );
    assert.equal(explicit.target, 'other-target');
    assert.equal(explicit.source, 'dev1');
    assert.throws(() => getImportOptions(['--page', page]), /No sandbox is running/);
});

test('a bare page URL is short for --page', () => {
    const page = 'https://www.nav.no/arbeid';
    const options = getImportOptions([page, '--include-drafts'], () => 'running-target');
    assert.equal(options.page, page);
    assert.equal(options.source, 'prod');
    assert.equal(options.target, 'running-target');
    assert.throws(() => getImportOptions([page, page], () => 'target'), /Unsupported argument/);
    assert.throws(() => getImportOptions(['arbeid'], () => 'target'), /Unsupported argument/);
});

test('include-drafts is an opt-in boolean flag', () => {
    const page = 'https://www.nav.no/arbeid';
    assert.notEqual(getImportOptions(['--page', page], () => 'target')['include-drafts'], true);
    assert.equal(
        getImportOptions(['--page', page, '--include-drafts'], () => 'target')['include-drafts'],
        true
    );
});

test('rejects unsupported and malformed arguments before any work', () => {
    assert.throws(() => getImportOptions(['--dump-name', 'old_dump']), /Unsupported argument/);
    assert.throws(() => getImportOptions(['--plan-only']), /Unsupported argument/);
    assert.throws(() => getImportOptions(['--unknown', 'value']), /Unsupported argument/);
    assert.throws(() => getImportOptions(['--target', '--force']), /Invalid argument/);
    assert.throws(
        () =>
            getImportOptions([
                '--source',
                'navno',
                '--target',
                'navno-curated',
                '--bundle',
                '../outside',
            ]),
        /Unsupported argument/
    );
});

test('the public create/update command loads without removed CLI modules', () => {
    const result = spawnSync(
        process.execPath,
        [
            fileURLToPath(new URL('../import.mjs', import.meta.url)),
            '--source',
            'prod',
            '--target',
            '../navno',
        ],
        { encoding: 'utf8', env: {} }
    );
    assert.equal(result.status, 1);
    // The sandbox name is rejected before the Enonic CLI check (no PATH here) or any prompt.
    assert.match(result.stderr, /Invalid sandbox name/);
    assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND/);
});

// No PATH and an empty HOME, so each error must come before the Enonic CLI check and any prompt.
const runImportWithoutCli = (t, args, setupHome = () => {}) => {
    const home = mkdtempSync(join(tmpdir(), 'curated-import-home-'));
    t.after(() => rmSync(home, { recursive: true, force: true }));
    setupHome(home);
    return spawnSync(
        process.execPath,
        [fileURLToPath(new URL('../import.mjs', import.meta.url)), ...args],
        { encoding: 'utf8', env: { HOME: home } }
    );
};

test('rejects local input mistakes before checking the CLI or prompting', (t) => {
    const cases = [
        [
            ['--source', 'prod', '--target', 'local', '--input', '/does/not/exist.txt'],
            /URL list not found: \/does\/not\/exist\.txt/,
        ],
        [
            ['--source', 'prod', '--target', 'local', '--page', 'ftp://www.nav.no/'],
            /Page URLs must use HTTP or HTTPS/,
        ],
        [
            ['--source', 'prod', '--target', 'local', '--page', 'https://www.nav.no/'],
            /--page requires an existing target sandbox/,
        ],
    ];
    cases.forEach(([args, expected]) => {
        const result = runImportWithoutCli(t, args);
        assert.equal(result.status, 1);
        assert.match(result.stderr, expected);
    });

    const result = runImportWithoutCli(t, ['--source', 'prod', '--target', 'local'], (home) => {
        mkdirSync(join(home, '.enonic/sandboxes/local'), { recursive: true });
        writeFileSync(join(home, '.enonic/sandboxes/local/.enonic'), '');
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Target sandbox local already exists; pass --force/);
});

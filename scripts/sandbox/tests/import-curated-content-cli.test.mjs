import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { isDeferredRelocationError } from '../apply-curated-export.mjs';
import { getImportOptions } from '../import-curated-content.mjs';

test('full import and refresh require an explicit target even if one is running', () => {
    for (const flags of [[], ['--force']]) {
        assert.throws(
            () => getImportOptions(['--source', 'prod', ...flags], () => 'running-target'),
            /Only --page defaults/
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
    assert.throws(() => getImportOptions(['--page', page]), /Only --page defaults/);
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
            fileURLToPath(new URL('../import-curated-content.mjs', import.meta.url)),
            '--source',
            'prod',
            '--target',
            '../navno',
        ],
        { encoding: 'utf8', env: {} }
    );
    assert.equal(result.status, 1);
    // The sandbox name is rejected before the Enonic CLI check (no PATH here) or any prompt.
    assert.match(result.stderr, /A valid, explicit local target sandbox name is required/);
    assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND/);
});

// No PATH and an empty HOME, so each error must come before the Enonic CLI check and any prompt.
const runImportWithoutCli = (t, args, setupHome = () => {}) => {
    const home = mkdtempSync(join(tmpdir(), 'curated-import-home-'));
    t.after(() => rmSync(home, { recursive: true, force: true }));
    setupHome(home);
    return spawnSync(
        process.execPath,
        [fileURLToPath(new URL('../import-curated-content.mjs', import.meta.url)), ...args],
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

test('streams import progress before the child script finishes', async (t) => {
    const directory = mkdtempSync(join(tmpdir(), 'curated-import-progress-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const script = join(directory, 'progress.mjs');
    writeFileSync(script, "console.log('Importing nodes'); setTimeout(() => {}, 1000);\n");
    const runner = new URL('../import-curated-content.mjs', import.meta.url).href;
    const child = spawn(
        process.execPath,
        [
            '--input-type=module',
            '-e',
            `import { runNodeScript } from ${JSON.stringify(runner)};
             runNodeScript(${JSON.stringify(script)}, []);
             console.log('Child finished');`,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    t.after(() => {
        if (child.exitCode === null) child.kill();
    });
    let output = '';
    let firstChunk;
    child.stdout.on('data', (chunk) => {
        firstChunk ??= chunk.toString();
        output += chunk;
    });
    const code = await new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('close', resolve);
    });
    assert.equal(code, 0);
    assert.match(firstChunk, /Importing nodes/);
    assert.doesNotMatch(firstChunk, /Child finished/);
    assert.match(output, /Child finished/);
});

test('accepts duplicate-id errors only for explicitly deferred content', () => {
    const error = 'Could not import node: Node deferred-id already exists - NodeIdExistsException';
    assert.equal(isDeferredRelocationError(error, ['deferred-id']), true);
    assert.equal(isDeferredRelocationError(error, ['different-id']), false);
    assert.equal(
        isDeferredRelocationError('Could not import node: invalid data', ['deferred-id']),
        false
    );
});

test('rejects unsafe import manifests before authenticating or mutating a target', (t) => {
    const directory = mkdtempSync(join(tmpdir(), 'curated-import-validation-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const exportEntry = {
        repoId: 'com.enonic.cms.default',
        sourceBranch: 'draft',
        contentPath: '/content/www.nav.no',
        importPath: '/content',
        exportName: 'safe-export',
    };
    const pinnedEntry = {
        repoId: exportEntry.repoId,
        contentId: 'site',
        branches: ['draft'],
        paths: { draft: '/content/www.nav.no' },
        versions: { draft: 'version' },
    };
    const cases = [
        [{ scope: 'unknown', exports: [exportEntry] }, /full or page scope/],
        [{ scope: 'page', exports: [exportEntry, exportEntry] }, /invalid repository branch/],
        [{ scope: 'page', exports: [{ ...exportEntry, exportName: '..' }] }, /safe export name/],
        [
            { scope: 'page', exports: [{ ...exportEntry, repoId: 'system-repo' }] },
            /invalid repository branch/,
        ],
        [{ scope: 'page', exports: [exportEntry], entries: [] }, /typed export manifest/],
        [
            {
                scope: 'page',
                exports: [exportEntry],
                entries: [pinnedEntry, pinnedEntry],
            },
            /duplicate target/,
        ],
        [
            {
                scope: 'page',
                exports: [exportEntry],
                entries: [pinnedEntry, { ...pinnedEntry, contentId: 'different-id' }],
            },
            /duplicate target/,
        ],
    ];
    for (const [manifest, expected] of cases) {
        const manifestPath = join(directory, 'manifest.json');
        writeFileSync(manifestPath, JSON.stringify(manifest));
        const result = spawnSync(
            process.execPath,
            [
                fileURLToPath(new URL('../apply-curated-export.mjs', import.meta.url)),
                '--manifest',
                manifestPath,
                '--sandbox',
                'target',
                '--service-url',
                'http://localhost:8080/_/service/no.nav.navno/curatedExportImport',
            ],
            { encoding: 'utf8', env: { HOME: directory, ENONIC_AUTH: 'synthetic:password' } }
        );
        assert.equal(result.status, 1);
        assert.match(result.stderr, expected);
    }
});

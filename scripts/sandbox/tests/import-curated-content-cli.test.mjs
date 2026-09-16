import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

test('rejects removed dump options and malformed arguments before any work', () => {
    assert.throws(
        () =>
            getImportOptions(['--source', 'prod', '--target', 'target', '--dump-name', 'old_dump']),
        /Use pnpm sandbox:dump/
    );
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
        [fileURLToPath(new URL('../import-curated-content.mjs', import.meta.url))],
        { encoding: 'utf8', env: {} }
    );
    assert.equal(result.status, 1);
    // With an empty environment there is no PATH, so the Enonic CLI availability
    // check fails before argument parsing; that still proves the module graph loads.
    assert.match(result.stderr, /Enonic CLI not found/);
    assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND/);
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
                formatVersion: 1,
                scope: 'page',
                exports: [exportEntry],
                entries: [pinnedEntry, pinnedEntry],
            },
            /duplicate target/,
        ],
        [
            {
                formatVersion: 1,
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

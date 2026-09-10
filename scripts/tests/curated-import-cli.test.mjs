import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

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
                fileURLToPath(new URL('../import-curated-export.mjs', import.meta.url)),
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

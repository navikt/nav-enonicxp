import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { labelCuratedProjects } from '../apply-curated-export.mjs';

test('labels curated projects as a dated production subset', () => {
    const projects = [
        { id: 'default', displayName: 'nav.no (dev) - kopi prod 20. april' },
        { id: 'navno-engelsk', displayName: 'nav.no engelsk' },
    ];

    assert.deepEqual(labelCuratedProjects(projects, '2026-08-14T12:44:11.501Z'), [
        {
            id: 'default',
            displayName: 'nav.no (dev) - utvalg fra prod 20. april',
        },
        {
            id: 'navno-engelsk',
            displayName: 'nav.no engelsk',
        },
    ]);
});

test('preserves a production subset date from a local source', () => {
    const projects = [{ id: 'default', displayName: 'nav.no (dev) - utvalg fra prod 20. april' }];

    assert.equal(
        labelCuratedProjects(projects, '2026-08-31T12:44:11.501Z')[0].displayName,
        'nav.no (dev) - utvalg fra prod 20. april'
    );
});

test('rejects an invalid manifest generation date', () => {
    assert.throws(() => labelCuratedProjects([], 'invalid'), /Invalid manifest generation date/);
});

test('rejects unknown command line flags instead of ignoring them', () => {
    const result = spawnSync(
        process.execPath,
        [
            fileURLToPath(new URL('../apply-curated-export.mjs', import.meta.url)),
            '--start-idx',
            '3',
        ],
        { encoding: 'utf8' }
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid argument: --start-idx/);
});

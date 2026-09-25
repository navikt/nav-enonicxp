import assert from 'node:assert/strict';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    statSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareCuratedImportFiles } from '../lib/import-files.mjs';
import { batchCuratedExpectations, loadCuratedExpectations } from '../lib/import-expectations.mjs';
import { getSourcePublishedEntries, importCuratedBundle } from '../apply-curated-export.mjs';

const fixture = (t) => {
    const directory = mkdtempSync(join(tmpdir(), 'curated-import-files-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const sourceDirectory = join(directory, 'source');
    const targetDirectory = join(directory, 'target');
    const nodeDirectory = join(sourceDirectory, 'bundle', 'www.nav.no', '_');
    mkdirSync(nodeDirectory, { recursive: true });
    writeFileSync(join(nodeDirectory, 'node.xml'), '<node/>');
    const expected = {
        contentId: 'site',
        contentPath: '/content/www.nav.no',
        versionId: 'source-version',
        childOrder: '_name ASC',
        manualOrderValue: null,
        indexConfig: { default: 'byType', configs: [] },
        nodeType: 'content',
    };
    const metadataPath = join(nodeDirectory, 'curated-metadata.json');
    writeFileSync(metadataPath, JSON.stringify(expected));
    const manifest = {
        scope: 'page',
        bundle: 'fixture',
        entries: [
            {
                repoId: 'com.enonic.cms.default',
                contentId: 'site',
                branches: ['draft'],
                paths: { draft: expected.contentPath },
                versions: { draft: expected.versionId },
            },
        ],
        exports: [
            {
                repoId: 'com.enonic.cms.default',
                sourceBranch: 'draft',
                exportName: 'bundle',
                contentPath: expected.contentPath,
                importPath: '/content',
            },
        ],
    };
    let verifications = 0;
    const prepare = (options = {}) =>
        prepareCuratedImportFiles({
            exportNames: ['bundle'],
            sourceDirectory,
            targetDirectory,
            verifyTarget: () => {
                verifications += 1;
            },
            ...options,
        });
    return {
        sourceDirectory,
        targetDirectory,
        metadataPath,
        manifest,
        expected,
        prepare,
        verifications: () => verifications,
    };
};

test('stages privately, restages consumed exports, and cleans only owned copies', (t) => {
    const f = fixture(t);
    const files = f.prepare();
    mkdirSync(join(f.targetDirectory, 'unrelated'));
    files.stage('bundle');
    assert.equal(statSync(join(f.targetDirectory, 'bundle')).mode & 0o777, 0o700);
    rmSync(join(f.targetDirectory, 'bundle'), { recursive: true });
    files.stage('bundle');
    assert.equal(
        readFileSync(join(f.targetDirectory, 'bundle/www.nav.no/_/node.xml'), 'utf8'),
        '<node/>'
    );
    assert.equal(f.verifications(), 3);
    files.cleanup();
    assert.ok(existsSync(f.metadataPath));
    assert.ok(existsSync(join(f.targetDirectory, 'unrelated')));
    assert.ok(!existsSync(join(f.targetDirectory, 'bundle')));
});

test('retains in-place source files before XP consumes them', (t) => {
    const f = fixture(t);
    const files = f.prepare({ targetDirectory: f.sourceDirectory });
    assert.notEqual(files.sourceDirectory, f.sourceDirectory);
    files.stage('bundle');
    rmSync(join(f.sourceDirectory, 'bundle'), { recursive: true });
    files.stage('bundle');
    assert.deepEqual(loadCuratedExpectations(f.manifest, files)[0].expectations, [f.expected]);
    files.cleanup();
    assert.ok(!existsSync(files.sourceDirectory));
});

test('refuses stale targets, symlinks, undeclared exports and overlapping roots', (t) => {
    const f = fixture(t);
    mkdirSync(join(f.targetDirectory, 'bundle'), { recursive: true });
    assert.throws(() => f.prepare(), /already exist/);
    rmSync(join(f.targetDirectory, 'bundle'), { recursive: true });
    symlinkSync(f.metadataPath, join(f.sourceDirectory, 'bundle', 'symlink'));
    assert.throws(() => f.prepare(), /regular files/);
    rmSync(join(f.sourceDirectory, 'bundle', 'symlink'));
    assert.throws(
        () => f.prepare({ targetDirectory: join(f.sourceDirectory, 'nested') }),
        /nested/
    );
    assert.throws(() => f.prepare({ exportNames: ['..'] }), /Invalid native export names/);
    const files = f.prepare();
    assert.throws(() => files.stage('unselected'), /undeclared/);
    files.cleanup();
});

test('requires local verification before any staging', (t) => {
    const f = fixture(t);
    assert.throws(
        () =>
            f.prepare({
                verifyTarget: () => {
                    throw new Error('Not local');
                },
            }),
        /Not local/
    );
    assert.ok(!existsSync(f.targetDirectory));
    let allowed = true;
    const files = f.prepare({
        verifyTarget: () => {
            if (!allowed) throw new Error('Target changed');
        },
    });
    allowed = false;
    assert.throws(() => files.stage('bundle'), /Target changed/);
    assert.ok(!existsSync(join(f.targetDirectory, 'bundle')));
    files.cleanup();
});

test('loads exact metadata expectations only for exported branches', (t) => {
    const f = fixture(t);
    const files = f.prepare();
    t.after(files.cleanup);
    const groups = loadCuratedExpectations(f.manifest, files);
    assert.deepEqual(groups, [
        { repository: 'com.enonic.cms.default', branch: 'draft', expectations: [f.expected] },
    ]);
    for (const change of [
        { versionId: 'stale' },
        { contentId: 'other' },
        { contentPath: '/content/www.nav.no/other' },
        { manualOrderValue: 12 },
        { indexConfig: [] },
    ]) {
        writeFileSync(f.metadataPath, JSON.stringify({ ...f.expected, ...change }));
        assert.throws(() => loadCuratedExpectations(f.manifest, files), /metadata expectation/);
    }
});

test('rejects unselected native nodes including an unexpected export-root node', (t) => {
    const f = fixture(t);
    for (const extra of ['_/node.xml', 'www.nav.no/extra/_/node.xml']) {
        const files = f.prepare();
        files.filesByExport.get('bundle').push(extra);
        assert.throws(() => loadCuratedExpectations(f.manifest, files), /unselected nodes/);
        files.cleanup();
    }
});

test('batches metadata expectations', () => {
    const group = {
        repository: 'com.enonic.cms.default',
        branch: 'draft',
        expectations: [{ contentId: 'a' }, { contentId: 'b' }, { contentId: 'c' }],
    };
    const batches = batchCuratedExpectations(group, 2);
    assert.deepEqual(
        batches.map((batch) => batch.expectations.map(({ contentId }) => contentId)),
        [['a', 'b'], ['c']]
    );
    assert.equal(batches[0].repository, group.repository);
    assert.throws(() => batchCuratedExpectations(group, 101), /between 1 and 100/);
});

test('reimports deferred IDs after normalization and then restores metadata', async (t) => {
    const f = fixture(t);
    const files = f.prepare();
    const calls = [];
    const progress = [];
    await importCuratedBundle({
        manifest: f.manifest,
        nativeExports: f.manifest.exports,
        files,
        reportProgress: (message) => progress.push(message),
        importNative: (entry, deferred) => {
            assert.match(progress.at(-1), /Importing nodes and binaries|Reimporting/);
            assert.ok(existsSync(join(f.targetDirectory, entry.exportName)));
            calls.push(['native', deferred]);
            rmSync(join(f.targetDirectory, entry.exportName), { recursive: true });
        },
        postAction: async (body) => {
            const phase = {
                'prepare-project-import': /Preparing content import/,
                'normalize-import-paths': /Normalizing imported paths/,
                'restore-metadata': /Restoring source metadata.*batch \d+\/\d+/,
            }[body.action];
            assert.match(progress.at(-1), phase);
            calls.push([body.action, body.branch]);
            if (body.action === 'prepare-project-import') return { deferredRelocations: ['site'] };
            if (body.action === 'normalize-import-paths') return {};
            return { checkedNodes: body.expectations.length, restoredNodes: 0 };
        },
    });
    assert.deepEqual(calls, [
        ['prepare-project-import', 'draft'],
        ['native', ['site']],
        ['normalize-import-paths', 'draft'],
        ['native', []],
        ['restore-metadata', 'draft'],
    ]);
    assert.match(progress[0], /Loading source metadata/);
    assert.ok(existsSync(f.metadataPath));
    assert.ok(!existsSync(join(f.targetDirectory, 'bundle')));
});

test('selects only source entries whose draft and master versions were identical', () => {
    const entries = [
        {
            repoId: 'com.enonic.cms.default',
            contentId: 'published',
            branches: ['draft', 'master'],
            versions: { draft: 'same', master: 'same' },
        },
        {
            repoId: 'com.enonic.cms.default',
            contentId: 'modified',
            branches: ['draft', 'master'],
            versions: { draft: 'draft-version', master: 'master-version' },
        },
        {
            repoId: 'com.enonic.cms.default',
            contentId: 'draft-only',
            branches: ['draft'],
            versions: { draft: 'draft-version' },
        },
    ];

    assert.deepEqual(
        getSourcePublishedEntries(entries, 'com.enonic.cms.default').map(
            ({ contentId }) => contentId
        ),
        ['published']
    );
});

test('fails before target mutations on stale expectations and cleans up after restore failure', async (t) => {
    const f = fixture(t);
    let files = f.prepare();
    writeFileSync(f.metadataPath, JSON.stringify({ ...f.expected, versionId: 'stale' }));
    const calls = [];
    await assert.rejects(
        importCuratedBundle({
            manifest: f.manifest,
            nativeExports: f.manifest.exports,
            files,
            postAction: async () => calls.push('mutation'),
            importNative: () => calls.push('native'),
        }),
        /metadata expectation/
    );
    assert.deepEqual(calls, []);
    writeFileSync(f.metadataPath, JSON.stringify(f.expected));
    files = f.prepare();
    await assert.rejects(
        importCuratedBundle({
            manifest: f.manifest,
            nativeExports: f.manifest.exports,
            files,
            importNative: () => {},
            postAction: async ({ action }) =>
                action === 'prepare-project-import' ? { deferredRelocations: [] } : {},
        }),
        /Incomplete metadata restore/
    );
    assert.ok(!existsSync(join(f.targetDirectory, 'bundle')));
    assert.ok(existsSync(f.metadataPath));
});

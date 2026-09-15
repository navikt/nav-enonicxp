import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { extractCuratedSource } from '../lib/source-extractor.mjs';
import { createSourceNode } from './fixtures/source-node.mjs';

const repository = 'com.enonic.cms.default';
const directory = (t) => {
    const path = resolve('scripts/sandbox/tests', `.source-extractor-${randomUUID()}`);
    mkdirSync(path, { recursive: true });
    t.after(() => rmSync(path, { recursive: true, force: true }));
    return path;
};
const manifest = (sources, exportName = 'curated-test') => ({
    scope: 'full',
    xpVersion: '7.14.4',
    exports: [{ exportName, repoId: repository, sourceBranch: 'master' }],
    entries: sources.map(({ node }) => ({
        repoId: repository,
        contentId: node._id,
        paths: { master: node._path },
        versions: { master: node._versionKey },
        branches: ['master'],
    })),
});
const options = (exportDirectory, sources, exportName) => ({
    manifest: manifest(sources, exportName),
    sourceServiceUrl: 'https://source.example.test/_/service/no.nav.navno/curatedExportSource',
    auth: 'fixture-user:fixture-password',
    exportDirectory,
});
const attach = (source, reference, bytes) => {
    source.binaryReferences.push(reference);
    source.properties.push({
        name: 'attachment',
        type: 'property-set',
        value: [
            { name: 'binary', type: 'binaryReference', value: reference },
            { name: 'size', type: 'long', value: String(bytes.length) },
            {
                name: 'sha512',
                type: 'string',
                value: createHash('sha512').update(bytes).digest('hex'),
            },
        ],
    });
};
const mockSource = (t, sources, binaries = {}) => {
    const requests = [];
    t.mock.method(globalThis, 'fetch', async (input, request) => {
        const url = new URL(input);
        requests.push({ url, request });
        if (url.pathname === '/_/idprovider/system') {
            return new Response(JSON.stringify({ authenticated: true }), {
                headers: { 'Set-Cookie': 'session=fixture' },
            });
        }
        if (request.method === 'POST') {
            const body = JSON.parse(request.body);
            return new Response(
                JSON.stringify({
                    nodes: body.contentIds.map((id) => sources.find(({ node }) => node._id === id)),
                })
            );
        }
        const bytes = binaries[url.searchParams.get('binaryReference')];
        if (!bytes) {
            return new Response('missing', { status: 404 });
        }
        return new Response(bytes);
    });
    return requests;
};

test('refuses an existing export directory without touching stale content or making requests', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    const requests = mockSource(t, [source]);
    mkdirSync(join(root, 'curated-test'));
    writeFileSync(join(root, 'curated-test/old-node.xml'), 'old content');
    await assert.rejects(extractCuratedSource(options(root, [source])), /EEXIST/);
    assert.equal(readFileSync(join(root, 'curated-test/old-node.xml'), 'utf8'), 'old content');
    assert.equal(requests.length, 0);
});

test('rolls back only directories reserved by this run when another export directory exists', async (t) => {
    const root = directory(t);
    mkdirSync(join(root, 'existing'));
    writeFileSync(join(root, 'existing/preserve'), 'preserve');
    const args = options(root, [createSourceNode()], 'new');
    args.manifest.exports.push({
        exportName: 'existing',
        repoId: repository,
        sourceBranch: 'draft',
    });
    await assert.rejects(extractCuratedSource(args), /EEXIST/);
    assert.equal(existsSync(join(root, 'new')), false);
    assert.equal(readFileSync(join(root, 'existing/preserve'), 'utf8'), 'preserve');
});

test('pins both node and binary reads to the manifest version, including multiple attachments', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    const first = Buffer.from('first binary');
    const second = Buffer.from('second binary');
    attach(source, 'first.pdf', first);
    attach(source, 'second.png', second);
    const requests = mockSource(t, [source], { 'first.pdf': first, 'second.png': second });
    const result = await extractCuratedSource(options(root, [source]));
    assert.deepEqual(result, { nodeCount: 1, binaryCount: 2 });
    assert.deepEqual(JSON.parse(requests[1].request.body).versionIds, ['source-version']);
    const binaryRequests = requests.filter(({ url }) => url.searchParams.has('binaryReference'));
    assert.equal(binaryRequests.length, 2);
    binaryRequests.forEach(({ url, request }) => {
        assert.equal(url.searchParams.get('versionId'), 'source-version');
        assert.equal(request.redirect, 'error');
    });
    assert.deepEqual(
        readFileSync(join(root, 'curated-test/www.nav.no/page/_/bin/first.pdf')),
        first
    );
    assert.deepEqual(
        readFileSync(join(root, 'curated-test/www.nav.no/page/_/bin/second.png')),
        second
    );
    const sidecar = JSON.parse(
        readFileSync(join(root, 'curated-test/www.nav.no/page/_/curated-metadata.json'))
    );
    assert.deepEqual(sidecar.binaries, [
        {
            reference: 'first.pdf',
            sha512: createHash('sha512').update(first).digest('hex'),
            size: String(first.length),
        },
        {
            reference: 'second.png',
            sha512: createHash('sha512').update(second).digest('hex'),
            size: String(second.length),
        },
    ]);
});

test('fails instead of mixing source versions and removes the incomplete export', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    const args = options(root, [source]);
    source.node._versionKey = 'newer-version';
    mockSource(t, [source]);
    await assert.rejects(extractCuratedSource(args), /Source node mismatch/);
    assert.equal(existsSync(join(root, 'curated-test')), false);
});

test('rejects manifests without source versions', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    mockSource(t, [source]);
    const args = options(root, [source]);
    delete args.manifest.entries[0].versions;
    await assert.rejects(extractCuratedSource(args), /no pinned master version/);
});

test('writes selected manual child-order files in page scope too', async (t) => {
    const root = directory(t);
    const parent = createSourceNode({
        _id: 'root',
        _name: 'www.nav.no',
        _path: '/content/www.nav.no',
        _childOrder: '_manualordervalue DESC',
    });
    const child = createSourceNode();
    child.manualOrderValue = '9223372036854775807';
    mockSource(t, [parent, child]);
    const args = options(root, [parent, child]);
    args.manifest.scope = 'page';
    await extractCuratedSource(args);
    assert.equal(
        readFileSync(join(root, 'curated-test/www.nav.no/_/manualChildOrder.txt'), 'utf8'),
        'page\n'
    );
});

test('verifies binary hashes and cleans failed downloads before returning failure', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    attach(source, 'image.jpg', Buffer.from('expected bytes'));
    mockSource(t, [source], { 'image.jpg': Buffer.from('incorrect bytes') });
    await assert.rejects(extractCuratedSource(options(root, [source])), /integrity mismatch/);
    assert.equal(existsSync(join(root, 'curated-test')), false);
    assert.deepEqual(readdirSync(join(root, '.binary-cache')), []);
});

test('reuses only verified content-addressed cache entries across fresh exports', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    const bytes = Buffer.from('unchanged binary');
    attach(source, 'image.jpg', bytes);
    const requests = mockSource(t, [source], { 'image.jpg': bytes });
    await extractCuratedSource(options(root, [source], 'first'));
    await extractCuratedSource(options(root, [source], 'second'));
    assert.equal(requests.filter(({ url }) => url.searchParams.has('binaryReference')).length, 1);
    assert.deepEqual(readFileSync(join(root, 'second/www.nav.no/page/_/bin/image.jpg')), bytes);
});

test('sanitizes typed text before writing native XML and fidelity metadata', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    source.properties.push({ name: 'text', type: 'string', value: 'before\u0002after\u{1f600}' });
    mockSource(t, [source]);
    const args = options(root, [source]);
    await extractCuratedSource(args);
    const metadataDirectory = join(root, 'curated-test/www.nav.no/page/_');
    const metadata = JSON.parse(readFileSync(join(metadataDirectory, 'curated-metadata.json')));
    assert.equal(metadata.versionId, 'source-version');
    assert.equal(
        metadata.properties.find(({ name }) => name === 'text').value,
        'beforeafter\u{1f600}'
    );
    assert.match(
        readFileSync(join(metadataDirectory, 'node.xml'), 'utf8'),
        /beforeafter\u{1f600}/u
    );
});

test('rejects zero workers instead of claiming binaries were copied', async (t) => {
    const root = directory(t);
    await assert.rejects(
        extractCuratedSource({
            ...options(root, [createSourceNode()]),
            binaryConcurrency: 0,
        }),
        /concurrency/
    );
});

test('allows injected metadata, binary, and session transports without reaching the network', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    const bytes = Buffer.from('injected binary');
    attach(source, 'file.pdf', bytes);
    const requests = [];
    t.mock.method(globalThis, 'fetch', () => {
        throw new Error('Default network transport must not be used by this test');
    });
    let sessionRequests = 0;
    const result = await extractCuratedSource({
        ...options(root, [source]),
        getSessionCookie: async () => {
            sessionRequests += 1;
            return 'session=injected';
        },
        fetchImpl: async (input, request) => {
            requests.push({ url: new URL(input), request });
            assert.equal(request.headers.Cookie, 'session=injected');
            return request.method === 'POST'
                ? new Response(JSON.stringify({ nodes: [source] }))
                : new Response(bytes);
        },
    });
    assert.equal(sessionRequests, 1);
    assert.equal(requests.length, 2);
    assert.equal(requests[1].url.searchParams.get('versionId'), 'source-version');
    assert.deepEqual(result, { nodeCount: 1, binaryCount: 1 });
});

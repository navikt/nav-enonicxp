import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
    downloadProjectIcons,
    extractCuratedSource,
    sanitizeXmlString,
    uploadProjectIcons,
    writeManualChildOrders,
    writeNativeNodeXml,
} from '../lib/extract.mjs';
import { createSourceNode } from './fixtures/source-node.mjs';

const directory = (t) => {
    const path = resolve('scripts/sandbox/tests', `.curated-extract-${randomUUID()}`);
    mkdirSync(path, { recursive: true });
    t.after(() => rmSync(path, { recursive: true, force: true }));
    return path;
};

test('writes actual XP types without guessing from field names', (t) => {
    const path = directory(t);
    const source = createSourceNode();
    source.properties.push(
        { name: 'from', type: 'string', value: 'Not a time' },
        { name: 'link', type: 'string', value: 'Not a reference' },
        { name: 'notDate', type: 'dateTime', value: '2026-09-08T00:00:00.000Z' },
        { name: 'maximum', type: 'long', value: '9223372036854775807' },
        { name: 'decimal', type: 'double', value: '2.5' },
        { name: 'enabled', type: 'boolean', value: 'true' },
        { name: 'lineEndings', type: 'string', value: 'first\r\nsecond' },
        { name: 'location', type: 'geoPoint', value: '59.9,10.7' },
        { name: 'local', type: 'localDateTime', value: '2026-09-08T00:00:00.000Z' },
        { name: 'url', type: 'link', value: '/content/path' }
    );
    writeNativeNodeXml(path, source);
    const xml = readFileSync(join(path, 'node.xml'), 'utf8');
    assert.match(xml, /<reference name="icon">image-id<\/reference>/);
    assert.match(xml, /<string name="link">Not a reference<\/string>/);
    assert.match(xml, /<string name="from">Not a time<\/string>/);
    assert.match(xml, /<dateTime name="notDate">2026-09-08T00:00:00\.000Z<\/dateTime>/);
    assert.match(xml, /<long name="maximum">9223372036854775807<\/long>/);
    assert.match(xml, /<localDate name="date">2026-09-08Z<\/localDate>/);
    assert.match(xml, /A &amp; B 😀/);
    assert.match(xml, /first&#13;\nsecond/);
    assert.match(xml, /<path>data\.title<\/path>/);
});

test('preserves property cardinality and typed nulls', (t) => {
    const path = directory(t);
    const source = createSourceNode();
    source.properties = [
        { name: 'target', type: 'reference', value: null },
        { name: 'target', type: 'reference', value: 'id' },
        { name: 'group', type: 'property-set', value: null },
        { name: 'group', type: 'property-set', value: [] },
    ];
    writeNativeNodeXml(path, source);
    const xml = readFileSync(join(path, 'node.xml'), 'utf8');
    assert.match(xml, /<reference isNull="true" name="target"\/>/);
    assert.match(xml, /<reference name="target">id<\/reference>/);
    assert.match(xml, /<property-set isNull="true" name="group"\/>/);
    assert.match(xml, /<property-set name="group">\s*<\/property-set>/);
});

test('sanitizes text values including attachment text without damaging supplementary Unicode', (t) => {
    const path = directory(t);
    const source = createSourceNode();
    source.properties = [
        {
            name: 'attachment',
            type: 'property-set',
            value: [
                { name: 'binary', type: 'binaryReference', value: 'file.pdf' },
                { name: 'text', type: 'string', value: '😀before\u0002after𐐷\ud800' },
            ],
        },
    ];
    writeNativeNodeXml(path, source);
    const xml = readFileSync(join(path, 'node.xml'), 'utf8');
    assert.match(xml, /😀beforeafter𐐷/);
    assert.match(xml, /<binaryReference name="binary">file.pdf<\/binaryReference>/);
    assert.equal(sanitizeXmlString('\ud800\udc00\ud800\u0000\ufffe'), '𐀀');
    const expectation = JSON.parse(readFileSync(join(path, 'curated-metadata.json'), 'utf8'));
    assert.deepEqual(Object.keys(expectation).sort(), [
        'childOrder',
        'contentId',
        'contentPath',
        'indexConfig',
        'manualOrderValue',
        'nodeType',
        'versionId',
    ]);
});

test('rejects missing type/index metadata and JSON number coercion', (t) => {
    const path = directory(t);
    assert.throws(() => writeNativeNodeXml(path, createSourceNode().node), /typed curated source/);
    const source = createSourceNode();
    delete source.node._indexConfig;
    assert.throws(() => writeNativeNodeXml(path, source), /index configuration/);
    const coerced = createSourceNode();
    // eslint-disable-next-line no-loss-of-precision -- deliberately testing rejection of precision-losing JSON numbers
    coerced.properties = [{ name: 'integer', type: 'long', value: 9223372036854775807 }];
    assert.throws(() => writeNativeNodeXml(path, coerced), /lexical XP value/);
});

test('identifies the node, nested property and value shape when a null was omitted', (t) => {
    const path = directory(t);
    const source = createSourceNode({ _id: 'page-id', _path: '/content/www.nav.no/page' });
    source.properties = [
        { name: 'publish', type: 'property-set', value: [{ name: 'to', type: 'dateTime' }] },
    ];
    assert.throws(
        () => writeNativeNodeXml(path, source),
        /\/content\/www\.nav\.no\/page \[page-id\]\.publish\.to \(XP type dateTime, received undefined\)/
    );
});

test('persists metadata for existing-node restore instead of inventing a manualOrderValue data property', (t) => {
    const path = directory(t);
    const source = createSourceNode({ _ts: '2026-09-08T08:00:00.123456789Z' });
    source.manualOrderValue = '9223372036854775807';
    writeNativeNodeXml(path, source);
    assert.doesNotMatch(readFileSync(join(path, 'node.xml'), 'utf8'), /name="manualOrderValue"/);
    assert.match(
        readFileSync(join(path, 'node.xml'), 'utf8'),
        /<timestamp>2026-09-08T08:00:00\.123456789Z<\/timestamp>/
    );
    assert.equal(
        JSON.parse(readFileSync(join(path, 'curated-metadata.json'), 'utf8')).manualOrderValue,
        '9223372036854775807'
    );
});

for (const direction of ['DESC', 'ASC']) {
    test(`writes exact 64-bit manual child order ${direction}`, (t) => {
        const root = directory(t);
        const parent = createSourceNode({
            _id: 'parent',
            _path: '/content/www.nav.no/menu',
            _name: 'menu',
            _childOrder: `_manualordervalue ${direction}, _timestamp DESC`,
        });
        const first = createSourceNode({
            _id: 'first',
            _path: '/content/www.nav.no/menu/first',
            _name: 'first',
        });
        first.manualOrderValue = '9223372036854775807';
        const second = createSourceNode({
            _id: 'second',
            _path: '/content/www.nav.no/menu/second',
            _name: 'second',
        });
        second.manualOrderValue = '9223372036854775806';
        [parent, first, second].forEach((source) =>
            writeNativeNodeXml(join(root, source.node._path.slice('/content/'.length), '_'), source)
        );
        writeManualChildOrders(root, [parent, second, first]);
        assert.equal(
            readFileSync(join(root, 'www.nav.no/menu/_/manualChildOrder.txt'), 'utf8'),
            direction === 'DESC' ? 'first\nsecond\n' : 'second\nfirst\n'
        );
    });
}

const repository = 'com.enonic.cms.default';
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
});

const draftExportOptions = (root, source, includeDrafts) => {
    const args = options(root, [source]);
    args.manifest.includeDrafts = includeDrafts;
    args.manifest.exports[0].sourceBranch = 'draft';
    args.manifest.entries[0] = {
        ...args.manifest.entries[0],
        paths: { draft: source.node._path, master: source.node._path },
        versions: { draft: source.node._versionKey, master: source.node._versionKey },
        branches: ['draft', 'master'],
    };
    return args;
};

test('reads the draft export from master unless drafts are included', async (t) => {
    for (const [includeDrafts, expectedBranch] of [
        [false, 'master'],
        [true, 'draft'],
    ]) {
        const root = directory(t);
        const source = createSourceNode();
        const bytes = Buffer.from('binary');
        attach(source, 'file.pdf', bytes);
        const requests = mockSource(t, [source], { 'file.pdf': bytes });
        await extractCuratedSource(draftExportOptions(root, source, includeDrafts));
        const batch = requests.find(({ url }) => url.pathname.endsWith('/curatedExportSource'));
        assert.equal(JSON.parse(batch.request.body).branch, expectedBranch);
        const binary = requests.find(({ url }) => url.searchParams.has('binaryReference'));
        assert.equal(binary.url.searchParams.get('branch'), expectedBranch);
        t.mock.restoreAll();
    }
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

test('sanitizes typed text before writing native XML', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    source.properties.push({ name: 'text', type: 'string', value: 'before\u0002after\u{1f600}' });
    mockSource(t, [source]);
    const args = options(root, [source]);
    await extractCuratedSource(args);
    const metadataDirectory = join(root, 'curated-test/www.nav.no/page/_');
    const metadata = JSON.parse(readFileSync(join(metadataDirectory, 'curated-metadata.json')));
    assert.equal(metadata.versionId, 'source-version');
    assert.match(
        readFileSync(join(metadataDirectory, 'node.xml'), 'utf8'),
        /beforeafter\u{1f600}/u
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
        getAuthHeaders: async () => {
            sessionRequests += 1;
            return { Cookie: 'session=injected' };
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

const droppedConnection = () =>
    new TypeError('fetch failed', { cause: new Error('other side closed') });

const retryOptions = (t, root, source, fetchImpl) => {
    const warnings = [];
    t.mock.method(console, 'warn', (message) => warnings.push(message));
    t.mock.method(process.stdout, 'write', () => true);
    return {
        warnings,
        args: {
            ...options(root, [source]),
            getAuthHeaders: async () => ({}),
            retryDelaysMs: [0, 0],
            fetchImpl,
        },
    };
};

test('retries dropped connections and gateway errors for node batches and binaries', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    const bytes = Buffer.from('retried binary');
    attach(source, 'file.pdf', bytes);
    const failures = {
        POST: [droppedConnection(), new Response('<html>Bad gateway</html>', { status: 502 })],
        GET: [new TypeError('terminated')],
    };
    const { args, warnings } = retryOptions(t, root, source, async (_input, request) => {
        const failure = failures[request.method || 'GET'].shift();
        if (failure instanceof Error) {
            throw failure;
        }
        if (failure) {
            return failure;
        }
        return request.method === 'POST' ? Response.json({ nodes: [source] }) : new Response(bytes);
    });
    const result = await extractCuratedSource(args);
    assert.deepEqual(result, { nodeCount: 1, binaryCount: 1 });
    assert.equal(warnings.length, 3);
    assert.match(
        warnings[0],
        /Node batch 1\/1 for com\.enonic\.cms\.default:master.*other side closed/
    );
    assert.match(warnings[1], /attempt 3\/3.*502 from/);
    assert.match(warnings[2], /Binary content-id\/file\.pdf.*terminated/);
});

test('names the failing request after the last retry and removes the incomplete export', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    let attempts = 0;
    const { args } = retryOptions(t, root, source, async () => {
        attempts += 1;
        throw droppedConnection();
    });
    await assert.rejects(extractCuratedSource(args), (error) => {
        assert.match(
            error.message,
            /^Node batch 1\/1 for com\.enonic\.cms\.default:master failed after 3 attempts: fetch failed$/
        );
        assert.equal(error.cause.message, 'other side closed');
        return true;
    });
    assert.equal(attempts, 3);
    assert.equal(existsSync(join(root, 'curated-test')), false);
});

test('does not retry client errors from the source', async (t) => {
    const root = directory(t);
    const source = createSourceNode();
    let attempts = 0;
    const { args, warnings } = retryOptions(t, root, source, async () => {
        attempts += 1;
        return Response.json({ message: 'Forbidden' }, { status: 403 });
    });
    await assert.rejects(
        extractCuratedSource(args),
        /^Error: Node batch 1\/1 for com\.enonic\.cms\.default:master failed: 403 from .*Forbidden/
    );
    assert.equal(attempts, 1);
    assert.equal(warnings.length, 0);
});

test('downloads available Content Studio project icons', async () => {
    const icons = await downloadProjectIcons({
        sourceServiceUrl: 'https://source.example/_/service/no.nav.navno/curatedExportSource',
        projects: [{ id: 'default' }, { id: 'without-icon' }],
        auth: 'user:password',
        getSessionCookie: async () => 'XPSESSION=source',
        fetchRequest: async (url, options) => {
            assert.equal(options.headers.Cookie, 'XPSESSION=source');
            if (url.pathname.endsWith('/list')) {
                return Response.json({
                    projects: [
                        { name: 'default', icon: { mimeType: 'image/svg+xml' } },
                        { name: 'without-icon', icon: null },
                    ],
                });
            }
            assert.equal(url.pathname, '/admin/rest-v2/cs/project/icon/default');
            return {
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'image/svg+xml' }),
                arrayBuffer: async () => Buffer.from('<svg/>'),
            };
        },
    });

    assert.equal(icons.length, 1);
    assert.equal(icons[0].projectId, 'default');
    assert.equal(icons[0].contentType, 'image/svg+xml');
    assert.equal(icons[0].data.toString(), '<svg/>');
});

test('uploads project icons after project creation', async () => {
    const requests = [];
    await uploadProjectIcons({
        targetServiceUrl: 'http://localhost:8080/_/service/no.nav.navno/curatedExportImport',
        icons: [
            { projectId: 'default', contentType: 'image/svg+xml', data: Buffer.from('<svg/>') },
        ],
        auth: 'su:password',
        getSessionCookie: async () => 'XPSESSION=target',
        fetchRequest: async (url, options) => {
            requests.push({ url, options });
            return { ok: true, status: 204 };
        },
    });

    assert.equal(requests[0].url.pathname, '/admin/rest-v2/cs/project/modifyIcon');
    assert.equal(requests[0].options.headers.Cookie, 'XPSESSION=target');
    assert.equal(requests[0].options.body.get('name'), 'default');
    assert.equal(requests[0].options.body.get('scaleWidth'), '512');
});

test('does not mistake an icon server error for an absent icon', async () => {
    await assert.rejects(
        downloadProjectIcons({
            sourceServiceUrl: 'https://source.example',
            projects: [{ id: 'default' }],
            auth: 'synthetic:password',
            getSessionCookie: async () => 'synthetic-cookie',
            fetchRequest: async (url) =>
                url.pathname.endsWith('/list')
                    ? Response.json({ projects: [{ name: 'default', icon: {} }] })
                    : new Response('Internal Server Error', { status: 500 }),
        }),
        /Could not read icon for project default: 500/
    );
});

test('preserves language flags without requesting nonexistent icon attachments', async () => {
    const requests = [];
    const icons = await downloadProjectIcons({
        sourceServiceUrl: 'https://source.example',
        projects: [{ id: 'navno-engelsk' }, { id: 'default' }],
        auth: 'synthetic:password',
        getSessionCookie: async () => 'synthetic-cookie',
        fetchRequest: async (url) => {
            requests.push(url.pathname);
            if (url.pathname.endsWith('/list')) {
                return Response.json({
                    projects: [
                        { name: 'navno-engelsk', language: 'en', icon: null },
                        { name: 'default', icon: { name: 'custom.svg' } },
                    ],
                });
            }
            assert.equal(url.pathname, '/admin/rest-v2/cs/project/icon/default');
            return new Response('<svg/>', {
                headers: { 'content-type': 'image/svg+xml' },
            });
        },
    });

    assert.equal(icons.length, 1);
    assert.equal(icons[0].projectId, 'default');
    assert.equal(icons[0].data.toString(), '<svg/>');
    assert.deepEqual(requests, [
        '/admin/rest-v2/cs/project/list',
        '/admin/rest-v2/cs/project/icon/default',
    ]);
});

test('does not skip a missing project or an authorization failure', async () => {
    for (const [status, body] of [
        [500, 'Project not found: default'],
        [500, 'Icon source not found for project: default'],
        [404, 'Not found'],
        [403, 'Forbidden'],
    ]) {
        await assert.rejects(
            downloadProjectIcons({
                sourceServiceUrl: 'https://source.example',
                projects: [{ id: 'default' }],
                auth: 'synthetic:password',
                getSessionCookie: async () => 'synthetic-cookie',
                fetchRequest: async (url) =>
                    url.pathname.endsWith('/list')
                        ? Response.json({ projects: [{ name: 'default', icon: {} }] })
                        : new Response(body, { status }),
            }),
            new RegExp(`Could not read icon for project default: ${status}`)
        );
    }
});

test('fails on unavailable or invalid project metadata', async () => {
    for (const [response, expected] of [
        [new Response('Forbidden', { status: 403 }), /Could not list project icons: 403/],
        [Response.json({}), /Invalid Content Studio project list/],
        [Response.json({ projects: [] }), /Project default is missing/],
    ]) {
        await assert.rejects(
            downloadProjectIcons({
                sourceServiceUrl: 'https://source.example',
                projects: [{ id: 'default' }],
                auth: 'synthetic:password',
                getSessionCookie: async () => 'synthetic-cookie',
                fetchRequest: async () => response,
            }),
            expected
        );
    }
});

test('downloads an English project custom icon instead of treating it as a language flag', async () => {
    const icons = await downloadProjectIcons({
        sourceServiceUrl: 'http://localhost:8080',
        projects: [{ id: 'navno-engelsk', language: 'en' }],
        auth: 'synthetic:password',
        getSessionCookie: async () => 'synthetic-cookie',
        fetchRequest: async (url) => {
            if (url.pathname.endsWith('/list')) {
                return Response.json({
                    projects: [
                        { name: 'navno-engelsk', language: 'en', icon: { name: 'flag.svg' } },
                    ],
                });
            }
            assert.equal(url.pathname, '/admin/rest-v2/cs/project/icon/navno-engelsk');
            return new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } });
        },
    });
    assert.equal(icons[0].projectId, 'navno-engelsk');
    assert.equal(icons[0].data.toString(), '<svg/>');
});

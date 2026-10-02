import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { clearInterval, setInterval } from 'node:timers';
import {
    authorizeDeployedSource,
    createCuratedPlan,
    inferCuratedSourceFromPage,
    parseContentStudioPageUrl,
    resolveCuratedPage,
    resolveCuratedSource,
} from '../lib/source.mjs';
import { REQUIRED_PROJECTS as projects } from '../lib/common.mjs';

test('resolves deployed source profiles', () => {
    assert.equal(resolveCuratedSource('prod').origin, 'https://portal-admin.oera.no');
    assert.equal(resolveCuratedSource('dev1').origin, 'https://portal-admin-dev.oera.no');
    assert.equal(resolveCuratedSource('dev2').origin, 'https://portal-admin-q6.oera.no');
});

test('resolves an explicit XP origin', () => {
    const source = resolveCuratedSource('https://xp.example.no/');
    assert.equal(source.origin, 'https://xp.example.no');
    const base = 'https://xp.example.no/webapp/no.nav.navno/curated-export';
    assert.equal(source.serviceUrl, `${base}/manifest`);
    assert.equal(source.sourceServiceUrl, `${base}/source`);
    assert.equal(source.authorizeUrl, `${base}/authorize`);
    assert.equal(source.tokenUrl, `${base}/token`);
});

test('gets a deployed source token through browser approval with PKCE', async () => {
    const source = resolveCuratedSource('dev2');
    const browserResults = [];
    let browser;
    const auth = await authorizeDeployedSource(source, {
        log: () => {},
        openBrowser: (href) => {
            browser = simulateBrowser(href);
        },
        fetchImpl: async (url, options) => {
            assert.equal(url, source.tokenUrl);
            const { code, verifier } = JSON.parse(options.body);
            assert.equal(code, 'a'.repeat(64));
            assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
            return Response.json({ token: 'b'.repeat(64) });
        },
    });
    await browser;
    // The forged state is ignored, and the handoff completes on the real redirect.
    assert.deepEqual(browserResults, [400, 200]);
    assert.deepEqual(auth, { token: 'b'.repeat(64) });

    async function simulateBrowser(href) {
        const url = new URL(href);
        assert.equal(url.origin + url.pathname, source.authorizeUrl);
        const callback = new URL(`http://127.0.0.1:${url.searchParams.get('port')}/callback`);
        callback.searchParams.set('code', 'a'.repeat(64));
        callback.searchParams.set('state', 'forged-state');
        browserResults.push((await fetch(callback)).status);
        callback.searchParams.set('state', url.searchParams.get('state'));
        browserResults.push((await fetch(callback)).status);
    }
});

test('sends the challenge for the verifier that is later exchanged', async () => {
    let challenge;
    await authorizeDeployedSource(resolveCuratedSource('dev2'), {
        log: () => {},
        openBrowser: async (href) => {
            const url = new URL(href);
            challenge = url.searchParams.get('challenge');
            await fetch(
                `http://127.0.0.1:${url.searchParams.get('port')}/callback?code=${'c'.repeat(64)}&state=${url.searchParams.get('state')}`
            );
        },
        fetchImpl: async (_url, options) => {
            const { verifier } = JSON.parse(options.body);
            assert.equal(createHash('sha256').update(verifier).digest('hex'), challenge);
            return Response.json({ token: 'd'.repeat(64) });
        },
    });
});

test('fails when browser approval times out or the token exchange is rejected', async () => {
    const source = resolveCuratedSource('dev2');
    await assert.rejects(
        authorizeDeployedSource(source, { log: () => {}, openBrowser: () => {}, timeoutMs: 20 }),
        /Timed out waiting for approval/
    );
    await assert.rejects(
        authorizeDeployedSource(source, {
            log: () => {},
            openBrowser: async (href) => {
                const url = new URL(href);
                await fetch(
                    `http://127.0.0.1:${url.searchParams.get('port')}/callback?code=${'e'.repeat(64)}&state=${url.searchParams.get('state')}`
                );
            },
            fetchImpl: async () => Response.json({ message: 'Invalid' }, { status: 401 }),
        }),
        /Token exchange with https:\/\/portal-admin-q6.oera.no failed \(HTTP 401\)/
    );
});

test('rejects credentials in a source URL without echoing them', () => {
    assert.throws(
        () => resolveCuratedSource('https://su:synthetic-password@xp.example.no'),
        (error) =>
            /must not contain credentials/.test(error.message) &&
            !error.message.includes('synthetic-password')
    );
});

test('resolves the running local sandbox and XP version', () => {
    const homeDirectory = mkdtempSync(join(tmpdir(), 'curated-source-'));
    const sandboxPath = join(homeDirectory, '.enonic', 'sandboxes', 'navno');
    mkdirSync(sandboxPath, { recursive: true });
    writeFileSync(join(sandboxPath, '.enonic'), 'distro = "enonic-xp-mac-arm64-sdk-7.16.6"\n');

    const source = resolveCuratedSource('navno', { homeDirectory, runningSandbox: 'navno' });
    assert.equal(source.kind, 'local');
    assert.equal(source.version, '7.16.6');
    assert.equal(source.sandboxPath, sandboxPath);
});

test('rejects a local sandbox that is not running', () => {
    const homeDirectory = mkdtempSync(join(tmpdir(), 'curated-source-'));
    const sandboxPath = join(homeDirectory, '.enonic', 'sandboxes', 'navno');
    mkdirSync(sandboxPath, { recursive: true });
    writeFileSync(join(sandboxPath, '.enonic'), 'distro = "enonic-xp-mac-arm64-sdk-7.16.6"\n');

    assert.throws(
        () => resolveCuratedSource('navno', { homeDirectory, runningSandbox: 'other' }),
        /Start source sandbox navno/
    );
});

test('infers deployed sources from public and Content Studio URLs', () => {
    assert.equal(inferCuratedSourceFromPage('https://www.nav.no/arbeid'), 'prod');
    assert.equal(
        inferCuratedSourceFromPage(
            'https://portal-admin-q6.oera.no/admin/tool/com.enonic.app.contentstudio/main/default/edit/content-id'
        ),
        'dev2'
    );
});

test('uses an explicit remote Content Studio origin as its source', () => {
    assert.equal(
        inferCuratedSourceFromPage(
            'https://xp.example.no/admin/tool/com.enonic.app.contentstudio/main/default/edit/content-id'
        ),
        'https://xp.example.no'
    );
});

test('keeps a public page URL for path planning', () => {
    const page = 'https://www.nav.no/arbeid';
    assert.equal(resolveCuratedPage({ page }), page);
});

test('parses a supported Content Studio edit URL', () => {
    assert.deepEqual(
        parseContentStudioPageUrl(
            'https://portal-admin.oera.no/admin/tool/com.enonic.app.contentstudio/main/navno-nynorsk/edit/content-id'
        ),
        {
            repository: 'com.enonic.cms.navno-nynorsk',
            branch: 'draft',
            contentId: 'content-id',
        }
    );
});

test('retains exact editor identity rather than resolving a draft path against master', () => {
    for (const project of ['default', 'navno-engelsk', 'navno-nynorsk']) {
        const result = resolveCuratedPage({
            page: `https://portal-admin.oera.no/admin/tool/com.enonic.app.contentstudio/main/${project}/edit/draft-only-id`,
        });
        assert.deepEqual(result, {
            repository: `com.enonic.cms.${project}`,
            branch: 'draft',
            contentId: 'draft-only-id',
        });
    }
});

const fixture = (t, scope = 'full', includeDrafts = false) => {
    const requests = [];
    const body = {
        scope,
        includeDrafts,
        projects,
        xpVersion: '7.16.6',
        applications: [],
        unresolvedPaths: [],
        missingContentTypes: [],
        entries: projects.map(({ id, language }) => ({
            repoId: `com.enonic.cms.${id}`,
            locale: language,
            contentId: 'site',
            branches: ['draft', 'master'],
            paths: { draft: '/content/www.nav.no', master: '/content/www.nav.no' },
            versions: { draft: 'draft-version', master: 'master-version' },
        })),
    };
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        requests.push({ url: String(url), ...options, body: JSON.parse(options.body) });
        return String(url).endsWith('/_/idprovider/system')
            ? new Response(JSON.stringify({ authenticated: true }), {
                  headers: { 'Set-Cookie': 'session=synthetic; HttpOnly' },
              })
            : new Response(JSON.stringify(body));
    });
    return {
        requests,
        body,
        options: {
            serviceUrl: 'https://source.example.test/_/service/no.nav.navno/curatedExportManifest',
            auth: 'synthetic:password',
            bundle: 'curated-plan',
            scope,
            includeDrafts,
        },
    };
};

test('plans a deployed source with its token instead of a password login', async (t) => {
    const f = fixture(t);
    await createCuratedPlan({ ...f.options, auth: { token: 'f'.repeat(64) }, paths: ['/arbeid'] });
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].headers['X-Curated-Export-Token'], 'f'.repeat(64));
    assert.equal(f.requests[0].headers.Cookie, undefined);
});

const mockManifestJob = (t, f, pollResponses) => {
    const requests = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        requests.push({ url: String(url), method: options.method, headers: options.headers });
        if (options.method === 'POST') {
            return new Response(JSON.stringify({ job: 'a'.repeat(64) }), { status: 202 });
        }
        const next = pollResponses.shift() ?? { status: 200, body: f.body };
        return new Response(JSON.stringify(next.body), { status: next.status });
    });
    return requests;
};

test('polls a deployed source until its manifest job is done', async (t) => {
    const f = fixture(t);
    const requests = mockManifestJob(t, f, [{ status: 202, body: { status: 'running' } }]);
    const messages = [];
    const plan = await createCuratedPlan({
        ...f.options,
        auth: { token: 'f'.repeat(64) },
        paths: ['/arbeid'],
        pollIntervalMs: 0,
        reportCounter: (text) => messages.push(text),
    });
    assert.deepEqual(plan.entries, f.body.entries);
    assert.deepEqual(
        requests.map(({ method }) => method),
        ['POST', 'GET', 'GET']
    );
    assert.equal(requests[1].url, `${f.options.serviceUrl}?job=${'a'.repeat(64)}`);
    assert.equal(requests[1].headers['X-Curated-Export-Token'], 'f'.repeat(64));
    assert.equal(messages.length, 2);
    assert.match(messages[0], /^\rSource is building the manifest \(\d+s\)$/);
    assert.equal(messages[1], '\n');
});

test('reports a failed manifest job', async (t) => {
    const f = fixture(t);
    mockManifestJob(t, f, [{ status: 500, body: { message: 'boom' } }]);
    await assert.rejects(
        createCuratedPlan({
            ...f.options,
            auth: { token: 'f'.repeat(64) },
            paths: ['/arbeid'],
            pollIntervalMs: 0,
        }),
        /Manifest service returned 500: {"message":"boom"}/
    );
});

test('gives up on a manifest job that never finishes', async (t) => {
    const f = fixture(t);
    const running = Array.from({ length: 1000 }, () => ({
        status: 202,
        body: { status: 'running' },
    }));
    mockManifestJob(t, f, running);
    await assert.rejects(
        createCuratedPlan({
            ...f.options,
            auth: { token: 'f'.repeat(64) },
            paths: ['/arbeid'],
            pollIntervalMs: 1,
            jobTimeoutMs: 20,
            reportCounter: () => {},
        }),
        /Manifest job exceeded 1 seconds/
    );
});

test('plans both branches of every project without extraction or target requests', async (t) => {
    const f = fixture(t);
    const plan = await createCuratedPlan({ ...f.options, paths: ['/arbeid'] });
    assert.equal(plan.exports.length, projects.length * 2);
    assert.equal(
        new Set(plan.exports.map(({ exportName }) => exportName)).size,
        projects.length * 2
    );
    assert.deepEqual(plan.entries, f.body.entries);
    assert.equal(f.requests.length, 2);
    assert.equal(f.requests[1].url, f.options.serviceUrl);
    assert.equal(f.requests[1].headers.Cookie, 'session=synthetic');
    assert.equal(f.requests[1].redirect, 'error');
    assert.deepEqual(f.requests[1].body, {
        paths: ['/www.nav.no/arbeid'],
        seeds: [],
        scope: 'full',
        includeDrafts: false,
    });
});

test('normalizes public page URLs and preserves exact editor identity', async (t) => {
    const f = fixture(t, 'page', true);
    f.body.entries = [
        {
            ...f.body.entries[1],
            branches: ['draft'],
            paths: { draft: '/content/www.nav.no/translated' },
            versions: { draft: 'draft-version' },
        },
    ];
    const seed = { repository: 'com.enonic.cms.navno-engelsk', branch: 'draft', contentId: 'site' };
    const plan = await createCuratedPlan({
        ...f.options,
        paths: ['https://www.nav.no/arbeid?ignored=yes#anchor'],
        seeds: [seed],
    });
    assert.deepEqual(f.requests[1].body, {
        paths: ['/www.nav.no/arbeid'],
        seeds: [seed],
        scope: 'page',
        includeDrafts: true,
    });
    assert.equal(plan.exports.length, 1);
    assert.equal(plan.exports[0].sourceBranch, 'draft');
    assert.equal(plan.exports[0].repoId, seed.repository);
});

test('rejects a manifest with a different draft selection', async (t) => {
    const f = fixture(t);
    f.body.includeDrafts = true;
    await assert.rejects(
        () => createCuratedPlan({ ...f.options, paths: ['/www.nav.no/arbeid'] }),
        /different draft selection/
    );
});

test('accepts text and JSON URL lists, ignoring comments and duplicates', async (t) => {
    const f = fixture(t);
    const directory = mkdtempSync(join(tmpdir(), 'curated-plan-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    for (const [name, content] of [
        ['paths.txt', '# comment\n/arbeid\nhttps://www.nav.no/arbeid\n'],
        ['paths.json', JSON.stringify(['/content/www.nav.no/arbeid', '/arbeid'])],
    ]) {
        const inputPath = join(directory, name);
        writeFileSync(inputPath, content);
        await createCuratedPlan({ ...f.options, inputPath });
        assert.deepEqual(f.requests.at(-1).body.paths, ['/www.nav.no/arbeid']);
    }
});

test('rejects invalid planning inputs before authentication', async (t) => {
    const f = fixture(t);
    for (const options of [
        { bundle: '..' },
        { scope: 'unknown' },
        { paths: [123] },
        { seeds: null },
    ]) {
        await assert.rejects(createCuratedPlan({ ...f.options, ...options }));
    }
    assert.equal(f.requests.length, 0);
});

test('rejects incomplete or mismatching plans', async (t) => {
    const f = fixture(t);
    for (const [change, expected] of [
        [{ unresolvedPaths: ['/missing'] }, /unresolved paths/],
        [{ missingContentTypes: ['missing:type'] }, /missing.*content types/],
        [{ projects: [] }, /topology/],
        [
            { applications: [{ key: 'required-app', required: true, installed: false }] },
            /unavailable/,
        ],
        [{ scope: 'page' }, /different selection scope/],
        [{ entries: [] }, /no entries/],
    ]) {
        const previous = { ...f.body };
        Object.assign(f.body, change);
        await assert.rejects(createCuratedPlan(f.options), expected);
        Object.assign(f.body, previous);
    }
});

test('rejects entries that are not version-pinned, unique and curated', async (t) => {
    const f = fixture(t);
    const [entry] = f.body.entries;
    for (const [entries, expected] of [
        [[null], /is invalid/],
        [[{ ...entry, repoId: 'system-repo' }], /is invalid/],
        [[{ ...entry, contentId: '../site' }], /is invalid/],
        [[{ ...entry, versions: { draft: 'draft-version' } }], /not version-pinned/],
        [[entry, entry], /duplicate target/],
        [[entry, { ...entry, contentId: 'different-id' }], /duplicate target/],
    ]) {
        f.body.entries = entries;
        await assert.rejects(createCuratedPlan({ ...f.options, scope: 'page' }), expected);
    }
});

test('requires every repository branch in a full plan', async (t) => {
    const f = fixture(t);
    f.body.entries = f.body.entries.map((entry) => ({
        ...entry,
        branches: ['draft'],
        paths: { draft: entry.paths.draft },
        versions: { draft: entry.versions.draft },
    }));
    await assert.rejects(
        createCuratedPlan(f.options),
        /no entries for com\.enonic\.cms\.default:master/
    );
});

test('allows long-running manifest requests and reports their timeout clearly', async (t) => {
    const f = fixture(t);
    // AbortSignal.timeout does not keep the event loop alive on its own.
    const keepAlive = setInterval(() => {}, 1000);
    t.after(() => clearInterval(keepAlive));
    t.mock.restoreAll();
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        if (String(url).endsWith('/_/idprovider/system')) {
            return new Response(JSON.stringify({ authenticated: true }), {
                headers: { 'Set-Cookie': 'session=synthetic; HttpOnly' },
            });
        }
        return new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => reject(options.signal.reason), {
                once: true,
            });
        });
    });

    await assert.rejects(
        createCuratedPlan({
            ...f.options,
            paths: ['/arbeid'],
            requestTimeoutMs: 10,
        }),
        /Manifest request exceeded 1 seconds/
    );
});

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createCuratedPlan } from '../lib/curated-plan.mjs';

const projects = [
    { id: 'default', language: 'no', parents: [] },
    { id: 'navno-engelsk', language: 'en', parents: ['default'] },
    { id: 'navno-nynorsk', language: 'nn', parents: ['default'] },
];
const fixture = (t, scope = 'full') => {
    const requests = [];
    const body = {
        scope,
        projects,
        xpVersion: '7.16.6',
        applications: [],
        unresolvedPaths: [],
        missingContentTypes: [],
        excludedDependencies: [],
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
        },
    };
};

test('plans all six branches without legacy supplements, extraction or target requests', async (t) => {
    const f = fixture(t);
    const plan = await createCuratedPlan({ ...f.options, paths: ['/arbeid'] });
    assert.equal(plan.formatVersion, 1);
    assert.equal(plan.exports.length, 6);
    assert.equal(new Set(plan.exports.map(({ exportName }) => exportName)).size, 6);
    assert.deepEqual(plan.entries, f.body.entries);
    assert.equal(f.requests.length, 2);
    assert.equal(f.requests[1].url, f.options.serviceUrl);
    assert.equal(f.requests[1].headers.Cookie, 'session=synthetic');
    assert.equal(f.requests[1].redirect, 'error');
    assert.deepEqual(f.requests[1].body, {
        paths: ['/www.nav.no/arbeid'],
        seeds: [],
        scope: 'full',
    });
});

test('normalizes public page URLs and preserves exact editor identity', async (t) => {
    const f = fixture(t, 'page');
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
    });
    assert.equal(plan.exports.length, 1);
    assert.equal(plan.exports[0].sourceBranch, 'draft');
    assert.equal(plan.exports[0].repoId, seed.repository);
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
    ]) {
        const previous = { ...f.body };
        Object.assign(f.body, change);
        await assert.rejects(createCuratedPlan(f.options), expected);
        Object.assign(f.body, previous);
    }
});

test('allows long-running manifest requests and reports their timeout clearly', async (t) => {
    const f = fixture(t);
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

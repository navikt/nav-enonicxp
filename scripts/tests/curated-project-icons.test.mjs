import assert from 'node:assert/strict';
import test from 'node:test';
import { downloadProjectIcons, uploadProjectIcons } from '../lib/curated-project-icons.mjs';

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

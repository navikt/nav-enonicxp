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
            if (url.pathname.endsWith('/without-icon')) {
                return { ok: false, status: 404 };
            }
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
        icons: [{ projectId: 'default', contentType: 'image/svg+xml', data: Buffer.from('<svg/>') }],
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
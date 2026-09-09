import assert from 'node:assert/strict';
import test from 'node:test';
import {
    inferCuratedSourceFromPage,
    parseContentStudioPageUrl,
    resolveCuratedPage,
} from '../lib/curated-page.mjs';

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

test('keeps a public page URL for path planning', async () => {
    const page = 'https://www.nav.no/arbeid';
    assert.equal(await resolveCuratedPage({ page }), page);
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

test('resolves a Content Studio content ID through the source service', async () => {
    const calls = [];
    const result = await resolveCuratedPage({
        page: 'https://portal-admin.oera.no/admin/tool/com.enonic.app.contentstudio/main/default/edit/content-id',
        sourceServiceUrl: 'https://portal-admin.oera.no/_/service/no.nav.navno/curatedExportSource',
        auth: 'user:password',
        getSessionCookie: async () => 'XPSESSION=token',
        fetchRequest: async (url, options) => {
            calls.push({ url, options });
            return {
                ok: true,
                json: async () => ({ node: { _path: '/content/www.nav.no/arbeid' } }),
            };
        },
    });

    assert.equal(result, '/content/www.nav.no/arbeid');
    assert.equal(calls[0].url.searchParams.get('repository'), 'com.enonic.cms.default');
    assert.equal(calls[0].url.searchParams.get('branch'), 'draft');
    assert.equal(calls[0].url.searchParams.get('contentId'), 'content-id');
    assert.equal(calls[0].options.headers.Cookie, 'XPSESSION=token');
});
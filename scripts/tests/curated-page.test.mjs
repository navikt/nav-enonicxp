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

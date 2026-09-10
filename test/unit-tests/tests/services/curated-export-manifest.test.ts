jest.mock('@navno-app/lib/exports/curated-content-export', () => ({
    createCuratedExportManifest: jest.fn(() => ({ entries: [] })),
}));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { error: jest.fn() },
}));

import * as authLib from '/lib/xp/auth';
import { createCuratedExportManifest } from '@navno-app/lib/exports/curated-content-export';
import { post } from '@navno-app/services/curatedExportManifest/curatedExportManifest';

describe('curated export manifest authorization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(authLib.hasRole).mockImplementation((role) => role === 'role:system.admin');
    });

    it.each(['role:system.admin.login', 'role:system.authenticated', 'role:system.everyone'])(
        'does not grant export capability to %s',
        (grantedRole) => {
            jest.mocked(authLib.hasRole).mockImplementation((role) => role === grantedRole);
            expect(post({ body: '{"paths":["/"]}' } as never).status).toBe(403);
            expect(createCuratedExportManifest).not.toHaveBeenCalled();
        }
    );

    it('allows actual system administrators', () => {
        jest.mocked(authLib.hasRole).mockImplementation((role) => role === 'role:system.admin');
        expect(post({ body: '{"paths":["/"]}' } as never).status).toBe(200);
        expect(createCuratedExportManifest).toHaveBeenCalledWith(['/'], 'full', { seeds: [] });
    });

    it('forwards validated editor seeds through the options object', () => {
        const seeds = [{
            repository: 'com.enonic.cms.navno-engelsk',
            branch: 'draft',
            contentId: 'editor-content-id',
        }];
        expect(post({
            body: JSON.stringify({ paths: [], scope: 'page', seeds }),
        } as never).status).toBe(200);
        expect(createCuratedExportManifest).toHaveBeenCalledWith([], 'page', { seeds });
    });

    it('supports a seeds-only request without public paths', () => {
        const seeds = [{
            repository: 'com.enonic.cms.default',
            branch: 'master',
            contentId: 'editor-content-id',
        }];
        expect(post({ body: JSON.stringify({ seeds, scope: 'page' }) } as never).status).toBe(200);
        expect(createCuratedExportManifest).toHaveBeenCalledWith([], 'page', { seeds });
    });

    it.each([
        null,
        {},
        'content-id',
        { repository: 'system-repo', branch: 'master', contentId: 'content-id' },
        { repository: 'com.enonic.cms.other', branch: 'master', contentId: 'content-id' },
        { repository: 'com.enonic.cms.default', branch: 'other', contentId: 'content-id' },
        { repository: 'com.enonic.cms.default', branch: 'draft', contentId: '/outside' },
    ])('rejects an invalid later seed before invoking the manifest builder: %j', (invalidSeed) => {
        const response = post({
            body: JSON.stringify({
                paths: [],
                seeds: [
                    { repository: 'com.enonic.cms.default', branch: 'master', contentId: 'valid-id' },
                    invalidSeed,
                ],
            }),
        } as never);
        expect(response.status).toBe(400);
        expect(createCuratedExportManifest).not.toHaveBeenCalled();
    });
});

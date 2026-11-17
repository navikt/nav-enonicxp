const getContentForExternalArchive = jest.fn();
const getArchivedContent = jest.fn(() => ({ rendered: 'archived' }));
const runInTimeTravelContext = jest.fn((_options: unknown, callback: () => unknown) => callback());
const runSitecontentGuillotineQuery = jest.fn(() => ({ rendered: 'version' }));

jest.mock('@navno-app/lib/external-archive/get-content', () => ({
    getContentForExternalArchive,
}));
jest.mock('@navno-app/lib/external-archive/get-archived-content', () => ({
    getArchivedContent,
}));
jest.mock('@navno-app/lib/time-travel/run-with-time-travel', () => ({
    runInTimeTravelContext,
}));
jest.mock('@navno-app/lib/guillotine/queries/run-sitecontent-query', () => ({
    runSitecontentGuillotineQuery,
}));
jest.mock('@navno-app/lib/time-travel/get-published-versions', () => ({
    getAllVersions: () => [],
    getVersionsForExternalArchive: () => [],
}));

import { Request } from '@enonic-types/core';
import { externalArchiveContentService } from '@navno-app/services/externalArchive/content/content';
import { getLayersData } from '@navno-app/lib/localization/layers-data';
import { getLocaleFromContext } from '@navno-app/lib/localization/locale-context';

const lastPublishedVersion = {
    _id: 'dagpenger',
    _versionKey: 'last-published',
    type: 'no.nav.navno:content-page-with-sidemenus',
    modifiedTime: '2026-10-01T10:00:00Z',
};

const getContent = (params: { versionId?: string; isArchived?: boolean; locale?: string }) => {
    getContentForExternalArchive.mockReturnValue({
        content: lastPublishedVersion,
        isArchived: !!params.isArchived,
    });

    return externalArchiveContentService({
        params: { id: 'dagpenger', locale: params.locale || 'no', versionId: params.versionId },
    } as unknown as Request);
};

describe('externalArchiveContentService', () => {
    test('renders the last published version with time travel when no version is selected', () => {
        const response = getContent({});

        expect(response.status).toBe(200);
        expect(runInTimeTravelContext).toHaveBeenCalledWith(
            expect.objectContaining({
                baseContentKey: 'dagpenger',
                branch: 'master',
                dateTime: lastPublishedVersion.modifiedTime,
            }),
            expect.any(Function)
        );
        expect(runSitecontentGuillotineQuery).toHaveBeenCalledTimes(1);
        expect(response.body).toMatchObject({ contentRenderProps: { rendered: 'version' } });
    });

    test('renders a selected version the same way as when no version is selected', () => {
        getContent({ versionId: 'last-published' });
        const withVersionId = runInTimeTravelContext.mock.calls[0][0];

        runInTimeTravelContext.mockClear();
        getContent({});
        const withoutVersionId = runInTimeTravelContext.mock.calls[0][0];

        expect(withoutVersionId).toEqual(withVersionId);
    });

    test('renders with the locale of the requested layer in the context', () => {
        runSitecontentGuillotineQuery.mockImplementationOnce(() => ({
            rendered: getLocaleFromContext(),
        }));

        const response = getContent({ locale: 'en' });

        expect(runInTimeTravelContext).toHaveBeenCalledWith(
            expect.objectContaining({ repoId: getLayersData().localeToRepoIdMap.en }),
            expect.any(Function)
        );
        expect(response.body).toMatchObject({ contentRenderProps: { rendered: 'en' } });
    });

    test('renders the last published version of archived content when no version is selected', () => {
        const response = getContent({ isArchived: true });

        expect(getArchivedContent).toHaveBeenCalledWith(
            'dagpenger',
            getLayersData().localeToRepoIdMap.no,
            undefined,
            'last-published'
        );
        expect(runInTimeTravelContext).not.toHaveBeenCalled();
        expect(response.body).toMatchObject({ contentRenderProps: { rendered: 'archived' } });
    });
});

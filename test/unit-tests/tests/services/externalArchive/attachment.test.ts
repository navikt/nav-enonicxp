const versions: Record<string, Record<string, unknown>> = {};
const getBinary = jest.fn(() => 'file-content');

const getRepoConnection = jest.fn(() => ({
    get: ({ versionId }: { versionId: string }) => versions[versionId] ?? null,
    getBinary,
}));

jest.mock('@navno-app/lib/repos/repo-utils', () => ({ getRepoConnection }));

import { Request } from '@enonic-types/core';
import { externalArchiveAttachmentService } from '@navno-app/services/externalArchive/attachment/attachment';

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const addVersion = (versionId: string, publishFrom: string) => {
    versions[versionId] = {
        _id: 'statistikk',
        publish: { from: publishFrom },
        attachment: {
            name: 'statistikk.xlsx',
            mimeType: 'application/vnd.ms-excel',
            binary: 'statistikk.xlsx',
        },
    };
};

addVersion('published', '2024-03-01T10:00:00Z');
addVersion('scheduled', tomorrow());

const getAttachment = (versionId: string) =>
    externalArchiveAttachmentService({
        params: { id: 'statistikk', locale: 'no', versionId },
    } as unknown as Request);

describe('externalArchiveAttachmentService', () => {
    test('returns the file of a published version', () => {
        const response = getAttachment('published');

        expect(response.status).toBe(200);
        expect(response.body).toBe('file-content');
    });

    test('returns 404 for a version scheduled for publishing, without reading the file', () => {
        const response = getAttachment('scheduled');

        expect(response.status).toBe(404);
        expect(getBinary).not.toHaveBeenCalled();
    });
});

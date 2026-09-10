const getNode = jest.fn();
const getBinary = jest.fn();
const readTypedNode = jest.fn();
const readTypedBinary = jest.fn();

jest.mock('@navno-app/lib/exports/curated-node-reader', () => ({
    getCuratedSourceNode: readTypedNode,
    getCuratedSourceBinary: readTypedBinary,
}));

jest.mock('@navno-app/lib/repos/repo-utils', () => ({
    getRepoConnection: jest.fn(() => ({ get: getNode, getBinary })),
}));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { error: jest.fn() },
}));
jest.mock('@navno-app/lib/localization/layers-data', () => ({
    isValidLocale: (locale: string) => locale === 'no',
    getLayersData: () => ({ localeToRepoIdMap: { no: 'com.enonic.cms.default' } }),
}));

import { get, post } from '@navno-app/services/curatedExportSource/curatedExportSource';
import { externalArchiveAttachmentService } from '@navno-app/services/externalArchive/attachment/attachment';
import * as authLib from '/lib/xp/auth';

const request = (params: Record<string, string>) => ({ params }) as never;
const properties = [{ name: 'link', type: 'reference', value: 'linked-id' }];

describe('curated export source', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(authLib.hasRole).mockImplementation((role) => role === 'role:system.admin');
        getNode.mockReturnValue({
            _id: 'content-id',
            _path: '/content/www.nav.no/page',
            attachment: { name: 'document.pdf', binary: 'document.pdf' },
        });
        readTypedNode.mockImplementation(({ contentId, versionId }) => ({
            formatVersion: 1,
            node: { ...getNode(), _id: contentId, _versionKey: versionId || 'version-id' },
            properties,
            binaryReferences: ['document.pdf'],
            manualOrderValue: '9007199254740993',
        }));
        readTypedBinary.mockImplementation((params) => getBinary(params));
    });

    it('rejects users without an administrative role', () => {
        jest.mocked(authLib.hasRole).mockReturnValue(false);

        const response = get(request({}));

        expect(response.status).toBe(403);
        expect(readTypedNode).not.toHaveBeenCalled();
        expect(getNode).not.toHaveBeenCalled();
    });

    it('denies console-login users for metadata and binary GET and batch POST', () => {
        jest.mocked(authLib.hasRole).mockImplementation(
            (role) => role === 'role:system.admin.login'
        );
        const params = {
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            contentId: 'restricted-draft-id',
        };
        expect(get(request(params)).status).toBe(403);
        expect(get(request({ ...params, binaryReference: 'private.pdf' })).status).toBe(403);
        expect(post({
            body: JSON.stringify({ ...params, contentIds: [params.contentId] }),
        } as never).status).toBe(403);
        expect(getNode).not.toHaveBeenCalled();
        expect(getBinary).not.toHaveBeenCalled();
        expect(readTypedNode).not.toHaveBeenCalled();
        expect(readTypedBinary).not.toHaveBeenCalled();
    });

    it.each([
        '/content/www.nav.no.evil/page',
        '/content/www.nav.no/../outside',
        '/content/www.nav.no//page',
        '/content/www.nav.no/%2e%2e/outside',
        '/content/other-site/page',
    ])('does not return content outside the canonical site boundary: %s', (_path) => {
        getNode.mockReturnValue({ _id: 'content-id', _path });
        expect(get(request({
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            contentId: 'content-id',
        })).status).toBe(404);
        expect(post({
            body: JSON.stringify({
                repository: 'com.enonic.cms.default',
                branch: 'draft',
                contentIds: ['content-id'],
                versionIds: ['version-id'],
            }),
        } as never).status).toBe(500);
        expect(getBinary).not.toHaveBeenCalled();
    });

    it.each([
        { branch: 'other' },
        { contentId: '/identity/system' },
        { contentId: 'role:system.admin' },
        { repository: 'com.enonic.cms.other' },
    ])('rejects invalid source targets for both methods: %j', (override) => {
        const params = {
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            contentId: 'content-id',
            ...override,
        };
        expect(get(request(params)).status).toBe(400);
        expect(post({
            body: JSON.stringify({
                ...params,
                contentIds: [params.contentId],
                versionIds: ['version-id'],
            }),
        } as never).status).toBe(400);
        expect(getNode).not.toHaveBeenCalled();
    });

    it('returns a selected node and its binary references', () => {
        const response = get(request({
            repository: 'com.enonic.cms.default',
            branch: 'master',
            contentId: 'content-id',
        }));

        expect(response.status).toBe(200);
        expect(response.body).toEqual(expect.objectContaining({
            formatVersion: 1,
            properties,
            binaryReferences: ['document.pdf'],
            manualOrderValue: '9007199254740993',
        }));
        expect(readTypedNode).toHaveBeenCalledWith({
            repository: 'com.enonic.cms.default',
            branch: 'master',
            contentId: 'content-id',
        });
    });

    it('streams only a binary attached to the requested node', () => {
        const stream = { value: 'binary-stream' };
        getBinary.mockReturnValue(stream);
        const response = get(request({
            repository: 'com.enonic.cms.default',
            branch: 'master',
            contentId: 'content-id',
            versionId: 'version-id',
            binaryReference: 'document.pdf',
        }));

        expect(response).toEqual(expect.objectContaining({ status: 200, body: stream }));
        expect(readTypedBinary).toHaveBeenCalledWith({
            repository: 'com.enonic.cms.default',
            branch: 'master',
            contentId: 'content-id',
            versionId: 'version-id',
            binaryReference: 'document.pdf',
        });
    });

    it('exports every repeated singular attachment in GET and batch POST', () => {
        const binaryReferences = ['first.pdf', 'second.pdf', 'third.pdf'];
        readTypedNode.mockReturnValue({
            formatVersion: 1,
            node: {
                _id: 'content-id',
                _versionKey: 'version-id',
                _path: '/content/www.nav.no/page',
                attachment: [
                    { name: 'first.pdf', binary: 'first.pdf' },
                    { name: 'second.pdf', binary: 'second.pdf' },
                ],
            },
            properties,
            binaryReferences,
            manualOrderValue: null,
        });
        const params = {
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            contentId: 'content-id',
            versionId: 'version-id',
        };
        expect(get(request(params))).toMatchObject({
            status: 200,
            body: { binaryReferences },
        });
        expect(post({
            body: JSON.stringify({
                ...params,
                contentIds: ['content-id'],
                versionIds: ['version-id'],
            }),
        } as never)).toMatchObject({
            status: 200,
            body: { nodes: [{ binaryReferences }] },
        });
        binaryReferences.forEach((binaryReference) => {
            getBinary.mockReturnValue({ stream: binaryReference });
            expect(get(request({ ...params, binaryReference })).status).toBe(200);
            expect(readTypedBinary).toHaveBeenLastCalledWith({ ...params, binaryReference });
        });
    });

    it('preserves the external archive single-attachment contract after widening node types', () => {
        getBinary.mockReturnValue({ stream: 'document.pdf' });
        expect(externalArchiveAttachmentService(request({
            id: 'content-id',
            versionId: 'version-id',
            locale: 'no',
        }))).toMatchObject({
            status: 200,
            body: { stream: 'document.pdf' },
            headers: { 'Content-Disposition': 'attachment; filename="document.pdf"' },
        });
    });

    it('does not pass an undefined binary reference from an unsupported archive attachment array', () => {
        getNode.mockReturnValue({ attachment: [
            { name: 'first.pdf', binary: 'first.pdf' },
            { name: 'second.pdf', binary: 'second.pdf' },
        ] });
        expect(externalArchiveAttachmentService(request({
            id: 'content-id',
            versionId: 'version-id',
            locale: 'no',
        })).status).toBe(404);
        expect(getBinary).not.toHaveBeenCalled();
    });

    it('rejects repositories outside the curated project set', () => {
        const response = get(request({
            repository: 'system-repo',
            branch: 'master',
            contentId: 'content-id',
        }));

        expect(response.status).toBe(400);
        expect(getNode).not.toHaveBeenCalled();
    });

    it('rejects binary references not attached to the requested node', () => {
        const response = get(request({
            repository: 'com.enonic.cms.default',
            branch: 'master',
            contentId: 'content-id',
            versionId: 'version-id',
            binaryReference: 'other.pdf',
        }));

        expect(response.status).toBe(404);
        expect(getBinary).not.toHaveBeenCalled();
    });

    it.each([undefined, '', '../version', 'version:other'])(
        'rejects binary reads without a valid explicit version: %s',
        (versionId) => {
            const response = get({
                params: {
                    repository: 'com.enonic.cms.default',
                    branch: 'draft',
                    contentId: 'content-id',
                    binaryReference: 'document.pdf',
                    ...(versionId !== undefined && { versionId }),
                },
            } as never);
            expect(response.status).toBe(400);
            expect(readTypedNode).not.toHaveBeenCalled();
            expect(readTypedBinary).not.toHaveBeenCalled();
        }
    );

    it.each([
        undefined,
        [],
        ['only-one'],
        ['version-id', 'other-version', 'extra-version'],
        ['version-id', null],
        ['version-id', '../other'],
    ])(
        'rejects invalid or non-parallel batch versions before any read: %j',
        (versionIds) => {
            const response = post({
                body: JSON.stringify({
                    repository: 'com.enonic.cms.default',
                    branch: 'draft',
                    contentIds: ['content-id', 'other-id'],
                    versionIds,
                }),
            } as never);
            expect(response.status).toBe(400);
            expect(readTypedNode).not.toHaveBeenCalled();
        }
    );

    it.each([
        { _id: 'wrong-id', _versionKey: 'version-id' },
        { _id: 'content-id', _versionKey: 'wrong-version' },
    ])('refuses mismatched typed-reader identities before streaming bytes: %j', (identity) => {
        readTypedNode.mockReturnValue({
            formatVersion: 1,
            node: { ...identity, _path: '/content/www.nav.no/page' },
            properties: [],
            binaryReferences: ['document.pdf'],
            manualOrderValue: null,
        });
        expect(get(request({
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            contentId: 'content-id',
            versionId: 'version-id',
            binaryReference: 'document.pdf',
        })).status).toBe(409);
        expect(readTypedBinary).not.toHaveBeenCalled();
        expect(post({
            body: JSON.stringify({
                repository: 'com.enonic.cms.default',
                branch: 'draft',
                contentIds: ['content-id'],
                versionIds: ['version-id'],
            }),
        } as never).status).toBe(500);
    });

    it('checks the versioned node root before allowing an otherwise attached binary', () => {
        readTypedNode.mockReturnValue({
            formatVersion: 1,
            node: {
                _id: 'content-id',
                _versionKey: 'version-id',
                _path: '/content/www.nav.no.evil/page',
            },
            properties: [],
            binaryReferences: ['document.pdf'],
            manualOrderValue: null,
        });
        expect(get(request({
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            contentId: 'content-id',
            versionId: 'version-id',
            binaryReference: 'document.pdf',
        })).status).toBe(404);
        expect(readTypedBinary).not.toHaveBeenCalled();
    });

    it('returns node metadata in validated batches', () => {
        const response = post({
            body: JSON.stringify({
                repository: 'com.enonic.cms.default',
                branch: 'master',
                contentIds: ['content-id', 'other-id'],
                versionIds: ['version-id', 'other-version'],
            }),
        } as never);

        expect(response.status).toBe(200);
        expect((response.body as { nodes: unknown[] }).nodes).toHaveLength(2);
        expect(getNode).toHaveBeenCalledTimes(2);
        expect(readTypedNode).toHaveBeenNthCalledWith(1, {
            repository: 'com.enonic.cms.default',
            branch: 'master',
            contentId: 'content-id',
            versionId: 'version-id',
        });
        expect(readTypedNode).toHaveBeenNthCalledWith(2, {
            repository: 'com.enonic.cms.default',
            branch: 'master',
            contentId: 'other-id',
            versionId: 'other-version',
        });
        expect(response.body).toMatchObject({
            nodes: [
                { formatVersion: 1, properties, manualOrderValue: '9007199254740993' },
                { formatVersion: 1, properties, manualOrderValue: '9007199254740993' },
            ],
        });
    });

    it('rejects metadata batches larger than 100 nodes', () => {
        const response = post({
            body: JSON.stringify({
                repository: 'com.enonic.cms.default',
                branch: 'master',
                contentIds: Array.from({ length: 101 }, (_, index) => `content-${index}`),
            }),
        } as never);

        expect(response.status).toBe(400);
        expect(getNode).not.toHaveBeenCalled();
    });
});
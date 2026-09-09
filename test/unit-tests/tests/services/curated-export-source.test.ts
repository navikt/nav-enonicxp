const getNode = jest.fn();
const getBinary = jest.fn();

jest.mock('@navno-app/lib/repos/repo-utils', () => ({
    getRepoConnection: jest.fn(() => ({ get: getNode, getBinary })),
}));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { error: jest.fn() },
}));

import { get, post } from '@navno-app/services/curatedExportSource/curatedExportSource';
import * as authLib from '/lib/xp/auth';

const request = (params: Record<string, string>) => ({ params }) as never;

describe('curated export source', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(authLib.hasRole).mockReturnValue(true);
        getNode.mockReturnValue({
            _id: 'content-id',
            _path: '/content/www.nav.no/page',
            attachment: { name: 'document.pdf', binary: 'document.pdf' },
        });
    });

    it('rejects users without an administrative role', () => {
        jest.mocked(authLib.hasRole).mockReturnValue(false);

        const response = get(request({}));

        expect(response.status).toBe(403);
        expect(getNode).not.toHaveBeenCalled();
    });

    it('returns a selected node and its binary references', () => {
        const response = get(request({
            repository: 'com.enonic.cms.default',
            branch: 'master',
            contentId: 'content-id',
        }));

        expect(response.status).toBe(200);
        expect(response.body).toEqual(expect.objectContaining({ binaryReferences: ['document.pdf'] }));
    });

    it('streams only a binary attached to the requested node', () => {
        const stream = { value: 'binary-stream' };
        getBinary.mockReturnValue(stream);
        const response = get(request({
            repository: 'com.enonic.cms.default',
            branch: 'master',
            contentId: 'content-id',
            binaryReference: 'document.pdf',
        }));

        expect(response).toEqual(expect.objectContaining({ status: 200, body: stream }));
        expect(getBinary).toHaveBeenCalledWith({
            key: 'content-id',
            binaryReference: 'document.pdf',
        });
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
            binaryReference: 'other.pdf',
        }));

        expect(response.status).toBe(404);
        expect(getBinary).not.toHaveBeenCalled();
    });

    it('returns node metadata in validated batches', () => {
        const response = post({
            body: JSON.stringify({
                repository: 'com.enonic.cms.default',
                branch: 'master',
                contentIds: ['content-id', 'other-id'],
            }),
        } as never);

        expect(response.status).toBe(200);
        expect((response.body as { nodes: unknown[] }).nodes).toHaveLength(2);
        expect(getNode).toHaveBeenCalledTimes(2);
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
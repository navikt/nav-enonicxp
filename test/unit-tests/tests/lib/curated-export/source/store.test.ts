const fakeRepo = {
    exists: jest.fn(),
    create: jest.fn(),
};

jest.mock('@navno-app/lib/repos/misc-repo', () => ({
    getMiscRepoConnection: () => fakeRepo,
}));

import { getCuratedStoreRepo } from '@navno-app/lib/curated-export/source/store';

describe('getCuratedStoreRepo', () => {
    test('creates a missing root', () => {
        fakeRepo.exists.mockReturnValue(false);
        expect(getCuratedStoreRepo('root')).toBe(fakeRepo);
        expect(fakeRepo.create).toHaveBeenCalledWith({ _parentPath: '/', _name: 'root' });
    });

    test('accepts a root created concurrently by another request', () => {
        fakeRepo.exists.mockReturnValueOnce(false).mockReturnValueOnce(true);
        fakeRepo.create.mockImplementationOnce(() => {
            throw new Error('NodeAlreadyExistsAtPathException');
        });
        expect(getCuratedStoreRepo('root')).toBe(fakeRepo);
    });

    test('rethrows when the root still does not exist', () => {
        fakeRepo.exists.mockReturnValue(false);
        fakeRepo.create.mockImplementationOnce(() => {
            throw new Error('create failed');
        });
        expect(() => getCuratedStoreRepo('root')).toThrow('create failed');
    });
});

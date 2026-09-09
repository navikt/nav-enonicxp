const getContent = jest.fn();
const getNode = jest.fn();
const moveNode = jest.fn();
const deleteNode = jest.fn();
const modifyNode = jest.fn();
const createNode = jest.fn();
const getSystemNode = jest.fn();
const modifySystemNode = jest.fn();
const getProject = jest.fn();

jest.mock('/lib/xp/node', () => ({
    connect: jest.fn(() => ({
        get: getSystemNode,
        modify: modifySystemNode,
    })),
}));
jest.mock('/lib/xp/auth');

jest.mock('/lib/xp/app', () => ({}));
jest.mock('/lib/xp/content', () => ({
    get: getContent,
}));
jest.mock('/lib/xp/project', () => ({ get: getProject }));
jest.mock('@navno-app/lib/context/run-in-context', () => ({
    runInContext: (_context: unknown, callback: () => unknown) => callback(),
}));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { error: jest.fn() },
}));
jest.mock('@navno-app/lib/repos/repo-utils', () => ({
    getRepoConnection: jest.fn(() => ({
        get: getNode,
        move: moveNode,
        delete: deleteNode,
        modify: modifyNode,
        create: createNode,
    })),
}));

import { post } from '@navno-app/services/curatedExportImport/curatedExportImport';
import * as authLib from '/lib/xp/auth';

const childRepository = 'com.enonic.cms.navno-engelsk';

describe('curated export import', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(authLib.hasRole).mockReturnValue(true);
        modifyNode.mockImplementation(({ editor }) =>
            editor({
                _id: 'invalid-content',
                _path: '/content/www.nav.no/invalid-content',
                _name: 'invalid-content',
            })
        );
    });

    it('rejects users without an administrative role', () => {
        jest.mocked(authLib.hasRole).mockReturnValue(false);

        const response = post({ body: '{}' } as never);

        expect(response.status).toBe(403);
        expect(modifyNode).not.toHaveBeenCalled();
    });

    it('disables the first-run wizard for the regular SU login form', () => {
        jest.mocked(authLib.deletePrincipal).mockReturnValue(true);
        getSystemNode.mockReturnValue({
            idProvider: { config: { adminUserCreationEnabled: true } },
        });
        modifySystemNode.mockImplementation(({ editor }) =>
            editor({ idProvider: { config: { adminUserCreationEnabled: true } } })
        );

        const response = post({
            body: JSON.stringify({ action: 'configure-login' }),
        } as never);

        expect(response).toMatchObject({
            status: 200,
            body: {
                disabledAdminUserCreation: true,
                removedLegacyBootstrapUser: true,
            },
        });
        expect(authLib.deletePrincipal).toHaveBeenCalledWith(
            'user:system:curated-login-bootstrap'
        );
        expect(modifySystemNode).toHaveBeenCalledWith({
            key: '/identity/system',
            editor: expect.any(Function),
        });
        const modifiedNode = modifySystemNode.mock.results[0].value;
        expect(modifiedNode.idProvider.config.adminUserCreationEnabled).toBeUndefined();
    });

    it('relocates moved inherited content before native import', () => {
        let movedIdRelocated = false;
        moveNode.mockImplementation(({ source }) => {
            if (source === 'moved-id') {
                movedIdRelocated = true;
            }
            return true;
        });
        getNode.mockImplementation((key: string) => {
            if (key === 'override-id') {
                return null;
            }
            if (key === 'same-id') {
                return { _id: 'same-id', _path: '/content/www.nav.no/no/same-path' };
            }
            if (key.endsWith('-curated-import-collision')) {
                return null;
            }
            if (key === '/content/www.nav.no/no/same-path') {
                return { _id: 'same-id', _path: key };
            }
            if (key === '/content/www.nav.no/no/override') {
                return { _id: 'inherited-id', _path: key };
            }
            if (key === '/content/www.nav.no/no/english-name') {
                return { _id: 'path-collision', _path: key };
            }
            if (key === 'moved-id') {
                return {
                    _id: 'moved-id',
                    _path: movedIdRelocated
                        ? '/content/www.nav.no/no/english-name'
                        : '/content/www.nav.no/no/norsk-navn',
                };
            }
            return {
                _id: 'moved-id',
                _path: '/content/www.nav.no/no/english-name',
            };
        });

        const response = post({
            body: JSON.stringify({
                action: 'prepare-project-import',
                repository: childRepository,
                branch: 'draft',
                entries: [
                    {
                        contentId: 'moved-id',
                        paths: {
                            draft: '/content/www.nav.no/no/english-name',
                            master: '/content/www.nav.no/no/old-english-name',
                        },
                        repoId: childRepository,
                        branches: ['draft', 'master'],
                    },
                    {
                        contentId: 'same-id',
                        paths: { draft: '/content/www.nav.no/no/same-path' },
                        repoId: childRepository,
                        branches: ['draft'],
                    },
                    {
                        contentId: 'override-id',
                        paths: { draft: '/content/www.nav.no/no/override' },
                        repoId: childRepository,
                        branches: ['draft'],
                    },
                ],
            }),
        } as never);

        expect(response).toMatchObject({
            status: 200,
            body: { relocatedInheritedCollisions: 3, deferredRelocations: [] },
        });
        expect(moveNode).toHaveBeenCalledWith({
            source: 'path-collision',
            target: '/content/www.nav.no/no/english-name-curated-import-collision',
        });
        expect(moveNode).toHaveBeenCalledWith({
            source: 'inherited-id',
            target: '/content/www.nav.no/no/override-curated-import-collision',
        });
        expect(moveNode).toHaveBeenCalledWith({
            source: 'moved-id',
            target: '/content/www.nav.no/no/english-name',
        });
    });

    it('refuses to prepare the default project repository', () => {
        const response = post({
            body: JSON.stringify({
                action: 'prepare-project-import',
                repository: 'com.enonic.cms.default',
                branch: 'master',
                entries: [],
            }),
        } as never);

        expect(response.status).toBe(500);
        expect(moveNode).not.toHaveBeenCalled();
    });

    it('defers relocation until a missing destination parent is imported', () => {
        getNode.mockImplementation((key: string) => {
            if (key === '/content/www.nav.no/no/new-parent') {
                return null;
            }
            return { _id: 'moved-child', _path: '/content/www.nav.no/no/old-parent/moved-child' };
        });

        const response = post({
            body: JSON.stringify({
                action: 'prepare-project-import',
                repository: childRepository,
                branch: 'draft',
                entries: [{
                    contentId: 'moved-child',
                    paths: { draft: '/content/www.nav.no/no/new-parent/moved-child' },
                    repoId: childRepository,
                    branches: ['draft'],
                }],
            }),
        } as never);

        expect(response).toMatchObject({
            status: 200,
            body: {
                relocatedInheritedCollisions: 0,
                deferredRelocations: ['moved-child'],
            },
        });
        expect(moveNode).not.toHaveBeenCalled();
    });

    it('normalizes filesystem-decomposed paths to manifest paths', () => {
        let normalized = false;
        moveNode.mockImplementation(() => {
            normalized = true;
            return true;
        });
        getNode.mockImplementation((key: string) => {
            if (key.endsWith('-curated-import-collision')) {
                return null;
            }
            return {
                _id: 'content-id',
                _path: normalized ? '/content/www.nav.no/Når' : '/content/www.nav.no/Når',
            };
        });

        const response = post({
            body: JSON.stringify({
                action: 'normalize-import-paths',
                repository: 'com.enonic.cms.default',
                branch: 'draft',
                entries: [{
                    contentId: 'content-id',
                    paths: { draft: '/content/www.nav.no/Når' },
                    repoId: 'com.enonic.cms.default',
                    branches: ['draft'],
                }],
            }),
        } as never);

        expect(response).toMatchObject({ status: 200, body: { normalizedPaths: 1 } });
        expect(moveNode).toHaveBeenCalledWith({
            source: 'content-id',
            target: '/content/www.nav.no/Når',
        });
    });

    it('restores a sanitized supplement with its original content id', () => {
        getNode.mockReturnValue({
            _id: 'invalid-content',
            _path: '/content/www.nav.no/invalid-content',
        });
        const supplement = {
            contentId: 'invalid-content',
            contentPath: '/content/www.nav.no/invalid-content',
            repoId: 'com.enonic.cms.default',
            branch: 'draft',
            invalidValuePaths: ['data.body'],
            node: {
                _id: 'invalid-content',
                _path: '/content/www.nav.no/invalid-content',
                _name: 'invalid-content',
                _childOrder: 'displayName ASC',
                displayName: 'Invalid content',
                type: 'no.nav.navno:main-article',
                data: { body: 'Beforeafter' },
                x: {},
            },
        };

        const response = post({
            body: JSON.stringify({
                action: 'restore-supplements',
                repository: supplement.repoId,
                branch: supplement.branch,
                supplements: [supplement],
            }),
        } as never);

        expect(response).toMatchObject({
            status: 200,
            body: {
                restoredSupplements: [
                    {
                        contentId: 'invalid-content',
                        contentPath: '/content/www.nav.no/invalid-content',
                        invalidValuePaths: ['data.body'],
                    },
                ],
            },
        });
        expect(deleteNode).not.toHaveBeenCalled();
    });

    it('recreates a missing native supplement after removing an exact-path collision', () => {
        getNode.mockImplementation((key: string) => {
            if (key === 'expected-id') {
                return null;
            }
            if (key === '/content/www.nav.no/missing') {
                return { _id: 'wrong-id' };
            }
            return { _id: 'parent-id' };
        });
        createNode.mockReturnValue({
            _id: 'expected-id',
            _path: '/content/www.nav.no/missing',
        });

        const response = post({
            body: JSON.stringify({
                action: 'restore-supplements',
                repository: 'com.enonic.cms.default',
                branch: 'draft',
                supplements: [{
                    contentId: 'expected-id',
                    contentPath: '/content/www.nav.no/missing',
                    repoId: 'com.enonic.cms.default',
                    branch: 'draft',
                    invalidValuePaths: ['data.text'],
                    node: { _id: 'expected-id', _path: '/content/www.nav.no/missing' },
                }],
            }),
        } as never);

        expect(response.status).toBe(200);
        expect(deleteNode).toHaveBeenCalledWith('/content/www.nav.no/missing');
        expect(createNode).toHaveBeenCalledWith(expect.objectContaining({
            _id: 'expected-id',
            _parentPath: '/content/www.nav.no',
            _name: undefined,
        }));
    });
});
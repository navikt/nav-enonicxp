const getNode = jest.fn();
const moveNode = jest.fn();
const deleteNode = jest.fn();
const modifyNode = jest.fn();
const createNode = jest.fn();
const getSystemNode = jest.fn();
const modifySystemNode = jest.fn();
const getProject = jest.fn();
const modifyProject = jest.fn();
const createProject = jest.fn();
const findChildren = jest.fn();
const refresh = jest.fn();
const pushNode = jest.fn();
const repairTarget = jest.fn();
const validateTarget = jest.fn();

jest.mock('@navno-app/lib/exports/target/curated-target-fidelity', () => ({
    repairCuratedTargetBatch: repairTarget,
    validateCuratedTargetBatch: validateTarget,
}));

jest.mock('/lib/xp/node', () => ({
    connect: jest.fn(() => ({
        get: getSystemNode,
        modify: modifySystemNode,
    })),
}));
jest.mock('/lib/xp/auth');

jest.mock('/lib/xp/app', () => ({}));
jest.mock('/lib/xp/project', () => ({
    get: getProject,
    modify: modifyProject,
    create: createProject,
}));
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
        findChildren,
        refresh,
        push: pushNode,
    })),
}));

import { get, post } from '@navno-app/services/curatedExportImport/curatedExportImport';
import * as authLib from '/lib/xp/auth';
import * as nodeLib from '/lib/xp/node';
import { getRepoConnection } from '@navno-app/lib/repos/repo-utils';

const childRepository = 'com.enonic.cms.navno-engelsk';
const rootPath = '/content/www.nav.no';
const relocationEntry = (contentId: string, path: string, repoId = childRepository) => ({
    contentId,
    paths: { draft: path },
    repoId,
    branches: ['draft'],
});
const mockNodeTree = (initial: Array<{ _id: string; _path: string }>) => {
    const nodes = new Map(initial.map((node) => [node._id, { ...node }]));
    if (!initial.some((node) => node._path === rootPath)) {
        nodes.set('site-root-id', { _id: 'site-root-id', _path: rootPath });
    }
    getNode.mockImplementation((key) =>
        nodes.get(key) || Array.from(nodes.values()).find((node) => node._path === key) || null
    );
    findChildren.mockImplementation(({ parentKey, count }) => {
        const parent = nodes.get(parentKey)!;
        const descendants = Array.from(nodes.values()).filter(
            (node) => node._path.startsWith(`${parent._path}/`)
        );
        return {
            total: descendants.length,
            count: Math.min(descendants.length, count),
            hits: descendants.slice(0, count).map((node) => ({ id: node._id })),
        };
    });
    moveNode.mockImplementation(({ source, target }) => {
        const node = nodes.get(source);
        if (!node || Array.from(nodes.values()).some((entry) => entry._path === target)) {
            return false;
        }
        const sourcePath = node._path;
        nodes.forEach((entry) => {
            if (entry._path === sourcePath || entry._path.startsWith(`${sourcePath}/`)) {
                entry._path = target + entry._path.slice(sourcePath.length);
            }
        });
        return true;
    });
    return nodes;
};
const importRequest = (body: unknown) => ({ body: JSON.stringify(body) }) as never;
const expectNoWrites = () => {
    [moveNode, deleteNode, modifyNode, createNode, pushNode, modifySystemNode, authLib.deletePrincipal,
        modifyProject, createProject, repairTarget]
        .forEach((write) => expect(write).not.toHaveBeenCalled());
};

describe('curated export import', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(authLib.hasRole).mockImplementation((role) => role === 'role:system.admin');
        Object.assign(app.config, { env: 'localhost', curatedImportEnabled: 'true' });
        jest.mocked(getRepoConnection).mockReturnValue({
            get: getNode,
            move: moveNode,
            delete: deleteNode,
            modify: modifyNode,
            create: createNode,
            findChildren,
            refresh,
            push: pushNode,
        } as never);
        findChildren.mockReturnValue({ total: 0, count: 0, hits: [] });
        jest.mocked(nodeLib.connect).mockReturnValue({
            get: getSystemNode,
            modify: modifySystemNode,
        } as never);
    });

    it('rejects users without an administrative role', () => {
        jest.mocked(authLib.hasRole).mockReturnValue(false);

        const response = post({ body: '{}' } as never);

        expect(response.status).toBe(403);
        expect(get().status).toBe(403);
        expect(modifyNode).not.toHaveBeenCalled();
    });

    it('returns a live administrator-only localhost preflight without repository access or writes', () => {
        expect(get()).toEqual({
            status: 200,
            contentType: 'application/json',
            headers: { 'Cache-Control': 'no-store' },
            body: {
                environment: 'localhost',
                importEnabled: true,
                importFormatVersion: 2,
                importInProgress: false,
            },
        });
        expect(getRepoConnection).not.toHaveBeenCalled();
        expect(nodeLib.connect).not.toHaveBeenCalled();
        expect(getProject).not.toHaveBeenCalled();
        expectNoWrites();

        app.config.curatedImportInProgress = 'true';
        expect(get().body).toMatchObject({ importInProgress: true });
        delete app.config.curatedImportInProgress;

        Object.assign(app.config, { curatedImportEnabled: 'false' });
        expect(get().status).toBe(403);
        expectNoWrites();
    });

    it('rejects console-login users before accessing repositories', () => {
        jest.mocked(authLib.hasRole).mockImplementation(
            (role) => role === 'role:system.admin.login'
        );
        const response = post(importRequest({ action: 'configure-login' }));
        expect(response.status).toBe(403);
        expect(get().status).toBe(403);
        expect(getRepoConnection).not.toHaveBeenCalled();
        expect(nodeLib.connect).not.toHaveBeenCalled();
        expectNoWrites();
    });

    it.each([undefined, '', 'p', 'prod', 'production', 'dev', 'q6', 'test'])(
        'rejects environment %s even with opt-in and a localhost Host',
        (env) => {
            Object.assign(app.config, { env, curatedImportEnabled: 'true' });
            const response = post({
                body: JSON.stringify({ action: 'configure-login' }),
                headers: { host: 'localhost:8080' },
            } as never);
            expect(response.status).toBe(403);
            expect(get().status).toBe(403);
            expect(nodeLib.connect).not.toHaveBeenCalled();
            expectNoWrites();
        }
    );

    it.each([undefined, '', 'false', 'TRUE', true, 1])(
        'rejects localhost without the exact trusted opt-in (%s)',
        (curatedImportEnabled) => {
            Object.assign(app.config, { curatedImportEnabled });
            expect(post(importRequest({ action: 'configure-login' })).status).toBe(403);
            expect(get().status).toBe(403);
            expectNoWrites();
        }
    );

    it.each(['configure-login', 'configure-projects', 'prepare-project-import', 'normalize-import-paths', 'repair-metadata', 'validate-fidelity', 'synchronize-published'])(
        'rejects arbitrary repositories and branches for %s before connecting',
        (action) => {
            for (const override of [
                { repository: 'system-repo' },
                { repository: 'com.enonic.cms.other' },
                { branch: 'other' },
                { branch: '../master' },
            ]) {
                const response = post(importRequest({
                    action,
                    repository: childRepository,
                    branch: 'draft',
                    entries: [],
                    ...override,
                }));
                expect(response.status).toBe(400);
            }
            expect(getRepoConnection).not.toHaveBeenCalled();
            expectNoWrites();
        }
    );

    it.each([
        '/content/www.nav.no.evil/page',
        '/content/www.nav.no/../outside',
        '/content/www.nav.no//page',
        '/content/www.nav.no/./page',
        '/content/www.nav.no/page/',
        '/content/www.nav.no/%2e%2e/outside',
        '/identity/roles/system.admin',
        '/content/www.nav.no\\outside',
    ])('rejects an invalid path in a later entry before any writes: %s', (path) => {
        const entry = {
            contentId: 'first-id',
            paths: { draft: '/content/www.nav.no/first' },
            repoId: childRepository,
            branches: ['draft'],
        };
        const response = post(importRequest({
            action: 'normalize-import-paths',
            repository: childRepository,
            branch: 'draft',
            entries: [entry, { ...entry, contentId: 'second-id', paths: { draft: path } }],
        }));
        expect(response.status).toBe(400);
        expect(getRepoConnection).not.toHaveBeenCalled();
        expectNoWrites();
    });

    it('synchronizes source-published draft nodes to master', () => {
        const entry = {
            contentId: 'content-id',
            paths: {
                draft: `${rootPath}/page`,
                master: `${rootPath}/page`,
            },
            repoId: childRepository,
            branches: ['draft', 'master'],
        };
        getNode.mockReturnValue({ _id: entry.contentId, _path: entry.paths.draft });
        pushNode.mockReturnValue({ success: [entry.contentId], failed: [] });

        expect(post(importRequest({
            action: 'synchronize-published',
            repository: childRepository,
            entries: [entry],
        }))).toMatchObject({
            status: 200,
            body: { synchronizedPublished: 1 },
        });
        expect(pushNode).toHaveBeenCalledWith({
            keys: [entry.contentId],
            target: 'master',
            resolve: false,
        });
    });

    it.each(['restore-supplements', 'validate-import', 'unknown-action'])(
        'rejects removed or unknown action %s without reading or writing repositories',
        (action) => {
            const response = post(importRequest({
                action,
                repository: childRepository,
                branch: 'draft',
                entries: [relocationEntry('content-id', `${rootPath}/page`)],
                supplements: [{
                    contentId: 'content-id',
                    contentPath: `${rootPath}/page`,
                    repoId: childRepository,
                    branch: 'draft',
                    invalidValuePaths: ['data.body'],
                    node: {
                        _id: 'content-id',
                        _path: `${rootPath}/page`,
                        _name: 'page',
                        type: 'no.nav.navno:main-article',
                        data: { body: 'Sanitized content' },
                    },
                }],
            }));
            expect(response).toMatchObject({
                status: 400,
                headers: { 'Cache-Control': 'no-store' },
                body: { message: 'Invalid curated export import action or payload' },
            });
            expect(getRepoConnection).not.toHaveBeenCalled();
            expect(nodeLib.connect).not.toHaveBeenCalled();
            expect(getProject).not.toHaveBeenCalled();
            expect(validateTarget).not.toHaveBeenCalled();
            expectNoWrites();
        }
    );

    it('rejects prototype-changing payload properties', () => {
        const response = post({
            body: '{"action":"configure-login","__proto__":{"member":"attacker"}}',
        } as never);
        expect(response.status).toBe(400);
        expectNoWrites();
    });

    it.each(['prepare-project-import', 'normalize-import-paths'])(
        'preflights all existing content IDs for %s before changing any paths',
        (action) => {
            const entry = {
                contentId: 'first-id',
                paths: { draft: '/content/www.nav.no/first' },
                repoId: childRepository,
                branches: ['draft'],
            };
            getNode.mockImplementation((key) => key === 'second-id'
                ? { _id: 'second-id', _path: '/outside/second' }
                : null);
            const response = post(importRequest({
                action,
                repository: childRepository,
                branch: 'draft',
                entries: [entry, {
                    ...entry,
                    contentId: 'second-id',
                    paths: { draft: '/content/www.nav.no/second' },
                }],
            }));
            expect(response.status).toBe(500);
            expectNoWrites();
        }
    );

    it('never relocates a colliding site root to a sibling outside the site', () => {
        getNode.mockImplementation((key) => key === '/content/www.nav.no'
            ? { _id: 'wrong-root-id', _path: key }
            : null);
        const response = post(importRequest({
            action: 'prepare-project-import',
            repository: childRepository,
            branch: 'draft',
            entries: [{
                contentId: 'expected-root-id',
                paths: { draft: '/content/www.nav.no' },
                repoId: childRepository,
                branches: ['draft'],
            }],
        }));
        expect(response.status).toBe(500);
        expectNoWrites();
        expect(getNode).not.toHaveBeenCalledWith('/content/www.nav.no-curated-import-collision');
    });

    it('validates later project permissions before configuring the default project', () => {
        const projects = [
            { id: 'default', language: 'no', parents: [], displayName: 'Nav.no' },
            { id: 'navno-engelsk', language: 'en', parents: ['default'], displayName: 'English' },
            {
                id: 'navno-nynorsk', language: 'nn', parents: ['default'], displayName: 'Nynorsk',
                permissions: { 'system.admin': ['user:system:attacker'] },
            },
        ];
        const response = post(importRequest({
            action: 'configure-projects',
            applications: [],
            projects,
        }));
        expect(response.status).toBe(400);
        expectNoWrites();
    });

    it('checks existing child project access before modifying any projects', () => {
        const projects = [
            { id: 'default', language: 'no', parents: [], displayName: 'Nav.no' },
            { id: 'navno-engelsk', language: 'en', parents: ['default'], displayName: 'English' },
            { id: 'navno-nynorsk', language: 'nn', parents: ['default'], displayName: 'Nynorsk' },
        ];
        getProject.mockImplementation(({ id }) => id === 'navno-nynorsk'
            ? { ...projects[2], permissions: { owner: ['user:system:local-owner'] } }
            : null);
        const response = post(importRequest({
            action: 'configure-projects',
            applications: [],
            projects,
        }));
        expect(response.status).toBe(500);
        expectNoWrites();
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
        const nodes = mockNodeTree([
            { _id: 'parent-id', _path: `${rootPath}/no` },
            { _id: 'moved-id', _path: `${rootPath}/no/norsk-navn` },
            { _id: 'same-id', _path: `${rootPath}/no/same-path` },
        ]);

        const response = post({
            body: JSON.stringify({
                action: 'prepare-project-import',
                repository: childRepository,
                branch: 'draft',
                entries: [
                    relocationEntry('moved-id', `${rootPath}/no/english-name`),
                    relocationEntry('same-id', `${rootPath}/no/same-path`),
                    relocationEntry('new-id', `${rootPath}/no/new-content`),
                ],
            }),
        } as never);

        expect(response).toMatchObject({
            status: 200,
            body: { relocatedInheritedCollisions: 1, deferredRelocations: [] },
        });
        expect(moveNode).toHaveBeenCalledWith({
            source: 'moved-id',
            target: '/content/www.nav.no/no/english-name',
        });
        expect(nodes.get('same-id')?._path).toBe(`${rootPath}/no/same-path`);
        expect(deleteNode).not.toHaveBeenCalled();
    });

    it('prepares relocations in the default project repository', () => {
        const repository = 'com.enonic.cms.default';
        const nodes = mockNodeTree([{ _id: 'content-id', _path: `${rootPath}/old-name` }]);
        const response = post({
            body: JSON.stringify({
                action: 'prepare-project-import',
                repository,
                branch: 'draft',
                entries: [relocationEntry('content-id', `${rootPath}/new-name`, repository)],
            }),
        } as never);

        expect(response.status).toBe(200);
        expect(nodes.get('content-id')?._path).toBe(`${rootPath}/new-name`);
        expect(getRepoConnection).toHaveBeenCalledWith({
            repoId: repository, branch: 'draft', asAdmin: true,
        });
        expect(deleteNode).not.toHaveBeenCalled();
    });

    it('defers relocation until a missing destination parent is imported', () => {
        getNode.mockImplementation((key: string) => {
            if (key !== 'moved-child') {
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
            if (key === rootPath) {
                return { _id: 'site-root-id', _path: rootPath };
            }
            if (key !== 'content-id') {
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

    it.each(['prepare-project-import', 'normalize-import-paths'])(
        'refuses an unselected target collision for %s before any batch moves',
        (action) => {
            const nodes = mockNodeTree([
                { _id: 'first-id', _path: `${rootPath}/first-old` },
                { _id: 'second-id', _path: `${rootPath}/second-old` },
                { _id: 'unselected-id', _path: `${rootPath}/second-new` },
                { _id: 'suffix-id', _path: `${rootPath}/second-new-curated-import-collision` },
            ]);
            const response = post(importRequest({
                action,
                repository: childRepository,
                branch: 'draft',
                entries: [
                    relocationEntry('first-id', `${rootPath}/first-new`),
                    relocationEntry('second-id', `${rootPath}/second-new`),
                ],
            }));
            expect(response.status).toBe(500);
            expect(response.body.message).toContain('occupied by unselected-id');
            expect(nodes.get('first-id')?._path).toBe(`${rootPath}/first-old`);
            expect(nodes.get('unselected-id')?._path).toBe(`${rootPath}/second-new`);
            expect(nodes.get('suffix-id')?._path).toBe(`${rootPath}/second-new-curated-import-collision`);
            expectNoWrites();
        }
    );

    it.each(['prepare-project-import', 'normalize-import-paths'])(
        'never treats a preexisting suffix occupant as cleanup data during %s',
        (action) => {
            const suffixPath = `${rootPath}/new-curated-import-collision`;
            const nodes = mockNodeTree([
                { _id: 'selected-id', _path: `${rootPath}/old` },
                { _id: 'suffix-id', _path: suffixPath },
                { _id: 'suffix-child', _path: `${suffixPath}/child` },
            ]);
            expect(post(importRequest({
                action,
                repository: childRepository,
                branch: 'draft',
                entries: [relocationEntry('selected-id', `${rootPath}/new`)],
            })).status).toBe(200);
            expect(nodes.get('selected-id')?._path).toBe(`${rootPath}/new`);
            expect(nodes.get('suffix-id')?._path).toBe(suffixPath);
            expect(nodes.get('suffix-child')?._path).toBe(`${suffixPath}/child`);
            expect(getNode).not.toHaveBeenCalledWith(suffixPath);
            expect(deleteNode).not.toHaveBeenCalled();
        }
    );

    it.each(['prepare-project-import', 'normalize-import-paths'])(
        'refuses moving unselected descendants, even in a page batch, during %s',
        (action) => {
            const nodes = mockNodeTree([
                { _id: 'first-id', _path: `${rootPath}/first-old` },
                { _id: 'parent-id', _path: `${rootPath}/old` },
                { _id: 'child-id', _path: `${rootPath}/old/child` },
                { _id: 'unselected-id', _path: `${rootPath}/old/child/grandchild` },
            ]);
            const response = post(importRequest({
                action,
                repository: childRepository,
                branch: 'draft',
                scope: 'page',
                entries: [
                    relocationEntry('first-id', `${rootPath}/first-new`),
                    relocationEntry('parent-id', `${rootPath}/new`),
                    relocationEntry('child-id', `${rootPath}/new/child`),
                ],
            }));
            expect(response.status).toBe(500);
            expect(response.body.message).toContain('unselected or inconsistent descendant unselected-id');
            expect(nodes.get('parent-id')?._path).toBe(`${rootPath}/old`);
            expect(nodes.get('unselected-id')?._path).toBe(`${rootPath}/old/child/grandchild`);
            expect(findChildren).toHaveBeenCalledWith({
                parentKey: 'parent-id', recursive: true, start: 0, count: 1001,
            });
            expectNoWrites();
        }
    );

    it.each(['prepare-project-import', 'normalize-import-paths'])(
        'moves selected-only subtrees parent-first and preserves every selected child during %s',
        (action) => {
            const oldPath = `${rootPath}/old-curated-import-collision`;
            const nodes = mockNodeTree([
                { _id: 'parent-id', _path: oldPath },
                { _id: 'child-id', _path: `${oldPath}/child` },
                { _id: 'grandchild-id', _path: `${oldPath}/child/grandchild` },
            ]);
            const response = post(importRequest({
                action,
                repository: childRepository,
                branch: 'draft',
                scope: 'page',
                entries: [
                    relocationEntry('grandchild-id', `${rootPath}/new/renamed/grandchild`),
                    relocationEntry('child-id', `${rootPath}/new/renamed`),
                    relocationEntry('parent-id', `${rootPath}/new`),
                ],
            }));
            expect(response.status).toBe(200);
            expect(moveNode).toHaveBeenNthCalledWith(1, { source: 'parent-id', target: `${rootPath}/new` });
            expect(moveNode).toHaveBeenNthCalledWith(2, { source: 'child-id', target: `${rootPath}/new/renamed` });
            expect(moveNode).toHaveBeenCalledTimes(2);
            expect(nodes.get('parent-id')?._path).toBe(`${rootPath}/new`);
            expect(nodes.get('child-id')?._path).toBe(`${rootPath}/new/renamed`);
            expect(nodes.get('grandchild-id')?._path).toBe(`${rootPath}/new/renamed/grandchild`);
            expect(nodes.size).toBe(4);
            expect(deleteNode).not.toHaveBeenCalled();
        }
    );

    it('allows fresh prepare without creating nodes, but rejects missing IDs after native import', () => {
        mockNodeTree([{ _id: 'first-id', _path: `${rootPath}/first-old` }]);
        const batch = {
            repository: childRepository,
            branch: 'draft',
            entries: [relocationEntry('missing-id', `${rootPath}/missing`)],
        };
        expect(post(importRequest({ ...batch, action: 'prepare-project-import' }))).toMatchObject({
            status: 200,
            body: { relocatedInheritedCollisions: 0, deferredRelocations: [] },
        });
        const response = post(importRequest({
            ...batch,
            action: 'normalize-import-paths',
            entries: [
                relocationEntry('first-id', `${rootPath}/first-new`),
                ...batch.entries,
            ],
        }));
        expect(response.status).toBe(500);
        expect(response.body.message).toContain('Native-imported selected content is missing: missing-id');
        expectNoWrites();
    });

    it('normalizes idempotently without moving unchanged nodes or their unselected children', () => {
        const nodes = mockNodeTree([
            { _id: 'selected-id', _path: `${rootPath}/selected` },
            { _id: 'unselected-id', _path: `${rootPath}/selected/child` },
        ]);
        const body = {
            action: 'normalize-import-paths',
            repository: childRepository,
            branch: 'draft',
            entries: [relocationEntry('selected-id', `${rootPath}/selected`)],
        };
        for (let index = 0; index < 2; index += 1) {
            expect(post(importRequest(body))).toMatchObject({ status: 200, body: { normalizedPaths: 0 } });
        }
        expect(nodes.get('unselected-id')?._path).toBe(`${rootPath}/selected/child`);
        expect(findChildren).not.toHaveBeenCalled();
        expectNoWrites();
    });

    it('rescues a selected child from an existing suffix container without deleting that container', () => {
        const suffixPath = `${rootPath}/parent-curated-import-collision`;
        const nodes = mockNodeTree([
            { _id: 'parent-id', _path: `${rootPath}/parent` },
            { _id: 'unselected-container', _path: suffixPath },
            { _id: 'child-id', _path: `${suffixPath}/child` },
            { _id: 'unselected-sibling', _path: `${suffixPath}/keep` },
        ]);
        const response = post(importRequest({
            action: 'normalize-import-paths',
            repository: childRepository,
            branch: 'draft',
            entries: [
                relocationEntry('parent-id', `${rootPath}/parent`),
                relocationEntry('child-id', `${rootPath}/parent/child`),
            ],
        }));
        expect(response.status).toBe(200);
        expect(moveNode).toHaveBeenCalledTimes(1);
        expect(moveNode).toHaveBeenCalledWith({ source: 'child-id', target: `${rootPath}/parent/child` });
        expect(nodes.get('child-id')?._path).toBe(`${rootPath}/parent/child`);
        expect(nodes.get('unselected-container')?._path).toBe(suffixPath);
        expect(nodes.get('unselected-sibling')?._path).toBe(`${suffixPath}/keep`);
        expect(deleteNode).not.toHaveBeenCalled();
    });

    it.each([
        { total: 1001, count: 0, hits: [] },
        { total: 1, count: 0, hits: [] },
    ])('fails closed when a subtree cannot be fully enumerated: %j', (result) => {
        mockNodeTree([{ _id: 'selected-id', _path: `${rootPath}/old` }]);
        findChildren.mockReturnValue(result);
        const response = post(importRequest({
            action: 'normalize-import-paths',
            repository: childRepository,
            branch: 'draft',
            entries: [relocationEntry('selected-id', `${rootPath}/new`)],
        }));
        expect(response.status).toBe(500);
        expect(response.body.message).toContain('Cannot completely inspect descendants');
        expectNoWrites();
    });

    it('refuses selected path swaps instead of using temporary paths or deleting content', () => {
        mockNodeTree([
            { _id: 'a-id', _path: `${rootPath}/a` },
            { _id: 'b-id', _path: `${rootPath}/b` },
        ]);
        expect(post(importRequest({
            action: 'normalize-import-paths',
            repository: childRepository,
            branch: 'draft',
            entries: [
                relocationEntry('a-id', `${rootPath}/b`),
                relocationEntry('b-id', `${rootPath}/a`),
            ],
        })).status).toBe(500);
        expectNoWrites();
    });

    it('permits a selected target occupant to vacate safely earlier in the plan', () => {
        const nodes = mockNodeTree([
            { _id: 'first-id', _path: `${rootPath}/occupied-target` },
            { _id: 'second-id', _path: `${rootPath}/old` },
        ]);
        const response = post(importRequest({
            action: 'normalize-import-paths',
            repository: childRepository,
            branch: 'draft',
            entries: [
                relocationEntry('second-id', `${rootPath}/occupied-target`),
                relocationEntry('first-id', `${rootPath}/x`),
            ],
        }));
        expect(response.status).toBe(200);
        expect(moveNode).toHaveBeenNthCalledWith(1, { source: 'first-id', target: `${rootPath}/x` });
        expect(moveNode).toHaveBeenNthCalledWith(2, { source: 'second-id', target: `${rootPath}/occupied-target` });
        expect(nodes.get('first-id')?._path).toBe(`${rootPath}/x`);
        expect(nodes.get('second-id')?._path).toBe(`${rootPath}/occupied-target`);
        expect(deleteNode).not.toHaveBeenCalled();
    });

    it('preserves master-branch ownership in the Nynorsk repository', () => {
        const repository = 'com.enonic.cms.navno-nynorsk';
        const nodes = mockNodeTree([{ _id: 'selected-id', _path: `${rootPath}/old` }]);
        expect(post(importRequest({
            action: 'normalize-import-paths',
            repository,
            branch: 'master',
            entries: [{
                contentId: 'selected-id',
                repoId: repository,
                paths: { master: `${rootPath}/new` },
                branches: ['master'],
            }],
        })).status).toBe(200);
        expect(getRepoConnection).toHaveBeenCalledWith({
            repoId: repository, branch: 'master', asAdmin: true,
        });
        expect(nodes.get('selected-id')?._path).toBe(`${rootPath}/new`);
        expect(deleteNode).not.toHaveBeenCalled();
    });

    it('refuses cyclic source and destination subtree dependencies before moving nodes', () => {
        mockNodeTree([
            { _id: 'a-id', _path: `${rootPath}/a` },
            { _id: 'b-id', _path: `${rootPath}/a/b` },
        ]);
        const response = post(importRequest({
            action: 'normalize-import-paths',
            repository: childRepository,
            branch: 'draft',
            entries: [
                relocationEntry('a-id', `${rootPath}/new/b/a`),
                relocationEntry('b-id', `${rootPath}/new/b`),
            ],
        }));
        expect(response.status).toBe(500);
        expect(response.body.message).toContain('Cannot safely order');
        expectNoWrites();
    });

    it('rechecks the subtree immediately before moving if it changed after preflight', () => {
        mockNodeTree([{ _id: 'selected-id', _path: `${rootPath}/old` }]);
        findChildren
            .mockReturnValueOnce({ total: 0, count: 0, hits: [] })
            .mockReturnValueOnce({ total: 1, count: 1, hits: [{ id: 'unexpected-id' }] });
        const response = post(importRequest({
            action: 'normalize-import-paths',
            repository: childRepository,
            branch: 'draft',
            entries: [relocationEntry('selected-id', `${rootPath}/new`)],
        }));
        expect(response.status).toBe(500);
        expectNoWrites();
    });

    it.each(['prepare-project-import', 'normalize-import-paths'])(
        'rejects entries from another repository or branch before %s writes',
        (action) => {
            for (const invalid of [
                relocationEntry('wrong-repo', `${rootPath}/wrong`, 'com.enonic.cms.default'),
                {
                    contentId: 'wrong-branch',
                    repoId: childRepository,
                    branches: ['master'],
                    paths: { master: `${rootPath}/wrong` },
                },
            ]) {
                expect(post(importRequest({
                    action,
                    repository: childRepository,
                    branch: 'draft',
                    entries: [invalid],
                })).status).toBe(400);
            }
            expect(getRepoConnection).not.toHaveBeenCalled();
            expectNoWrites();
        }
    );

    describe('target fidelity dispatch', () => {
        const batch = {
            repository: childRepository,
            branch: 'draft',
            scope: 'page',
            expectations: [{
                formatVersion: 2,
                contentId: 'selected-id',
                contentPath: `${rootPath}/selected`,
                nodeType: 'content',
                childOrder: '_name ASC',
                manualOrderValue: null,
                indexConfig: {},
                properties: [],
                binaries: [],
                manualChildOrder: null,
            }],
            absentContentIds: ['absent-id'],
        };

        it.each(['repair-metadata', 'validate-fidelity'])('forwards %s through the guarded no-store dispatch', (action) => {
            const helper = action === 'repair-metadata' ? repairTarget : validateTarget;
            const other = action === 'repair-metadata' ? validateTarget : repairTarget;
            const result = { checkedNodes: 1, checkedBinaries: 0, checkedAbsentEntries: 1, repairedNodes: 0 };
            helper.mockReturnValue(result);
            expect(post(importRequest({ ...batch, action }))).toEqual({
                status: 200,
                contentType: 'application/json',
                headers: { 'Cache-Control': 'no-store' },
                body: result,
            });
            expect(helper).toHaveBeenCalledWith(batch);
            expect(other).not.toHaveBeenCalled();
            expect(getRepoConnection).not.toHaveBeenCalled();
        });

        it.each(['repair-metadata', 'validate-fidelity'])('retains administrator and trusted localhost guards for %s', (action) => {
            jest.mocked(authLib.hasRole).mockImplementation((role) => role === 'role:system.admin.login');
            expect(post(importRequest({ ...batch, action })).status).toBe(403);
            jest.mocked(authLib.hasRole).mockReturnValue(true);
            for (const config of [
                { env: 'dev', curatedImportEnabled: 'true' },
                { env: 'p', curatedImportEnabled: 'true' },
                { env: undefined, curatedImportEnabled: 'true' },
                { env: 'localhost', curatedImportEnabled: 'false' },
            ]) {
                Object.assign(app.config, config);
                expect(post(importRequest({ ...batch, action })).status).toBe(403);
            }
            expect(repairTarget).not.toHaveBeenCalled();
            expect(validateTarget).not.toHaveBeenCalled();
        });

        it.each(['repair-metadata', 'validate-fidelity'])('rejects invalid dispatch scope and missing payload fields for %s', (action) => {
            for (const invalid of [
                { scope: 'other' },
                { scope: undefined },
                { repository: 'system-repo' },
                { branch: 'other' },
                { expectations: null },
            ]) {
                expect(post(importRequest({ ...batch, action, ...invalid })).status).toBe(400);
            }
            expect(repairTarget).not.toHaveBeenCalled();
            expect(validateTarget).not.toHaveBeenCalled();
        });

        it('surfaces target helper failure without falling back to another mutation path', () => {
            repairTarget.mockImplementation(() => { throw new Error('Target fingerprint mismatch'); });
            const response = post(importRequest({ ...batch, action: 'repair-metadata' }));
            expect(response.status).toBe(500);
            expect(response.body.message).toContain('Target fingerprint mismatch');
            expect(moveNode).not.toHaveBeenCalled();
            expect(deleteNode).not.toHaveBeenCalled();
            expect(validateTarget).not.toHaveBeenCalled();
        });
    });

});
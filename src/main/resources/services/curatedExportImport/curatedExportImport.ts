import { Request } from '@enonic-types/core';
import { userCanManageCuratedExports } from '../../lib/utils/auth-utils';
import * as appLib from '/lib/xp/app';
import * as authLib from '/lib/xp/auth';
import * as nodeLib from '/lib/xp/node';
import * as projectLib from '/lib/xp/project';
import * as schedulerLib from '/lib/xp/scheduler';
import { Project } from '/lib/xp/project';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { runInContext } from '../../lib/context/run-in-context';
import { logger } from '../../lib/utils/logging';
import { getRepoConnection } from '../../lib/repos/repo-utils';

const REQUIRED_PROJECTS = [
    { id: 'default', language: 'no', parents: [] },
    { id: 'navno-engelsk', language: 'en', parents: ['default'] },
    { id: 'navno-nynorsk', language: 'nn', parents: ['default'] },
] as const;
const REQUIRED_REPO_IDS = REQUIRED_PROJECTS.map(({ id }) => `com.enonic.cms.${id}`);
const REQUIRED_CHILD_REPO_IDS = REQUIRED_REPO_IDS.slice(1);
const COLLISION_PATH_SUFFIX = '-curated-import-collision';

type ImportEntry = {
    contentId: string;
    paths: Partial<Record<'draft' | 'master', string>>;
    repoId: string;
    branches: Array<'draft' | 'master'>;
};

type RequestBody = {
    action?: 'configure-login' | 'configure-projects' | 'prepare-project-import' | 'normalize-import-paths' | 'restore-supplements' | 'validate-import';
    applications?: RequiredApplication[];
    projects?: Project[];
    repository?: string;
    branch?: 'draft' | 'master';
    entries?: ImportEntry[];
    supplements?: ImportSupplement[];
};

const configureLogin = () => {
    const removedLegacyBootstrapUser = authLib.deletePrincipal(
        'user:system:curated-login-bootstrap'
    );
    const connection = nodeLib.connect({
        repoId: 'system-repo',
        branch: 'master',
        principals: ['role:system.admin'],
    });
    const idProvider = connection.get<Record<string, unknown>>('/identity/system') as {
        idProvider?: { config?: { adminUserCreationEnabled?: boolean } };
    } | null;
    if (!idProvider?.idProvider?.config?.adminUserCreationEnabled) {
        return { disabledAdminUserCreation: false, removedLegacyBootstrapUser };
    }
    connection.modify({
        key: '/identity/system',
        editor: (systemIdProvider) => {
            const configuredIdProvider = systemIdProvider as typeof idProvider;
            delete configuredIdProvider!.idProvider!.config!.adminUserCreationEnabled;
            return systemIdProvider;
        },
    });
    return { disabledAdminUserCreation: true, removedLegacyBootstrapUser };
};

type ImportSupplement = {
    contentId: string;
    contentPath: string;
    repoId: string;
    branch: 'draft' | 'master';
    invalidValuePaths: string[];
    node: RepoNode<Content>;
};

type RequiredApplication = {
    key: string;
    version: string | null;
    installed: boolean;
    started: boolean;
    required?: boolean;
};

const NON_RESTORABLE_NODE_KEYS = [
    '_id',
    '_path',
    '_versionKey',
    '_ts',
    '_state',
    '_nodeType',
    'attachments',
    'hasChildren',
    'valid',
    'publish',
];

const getRestorableNodeData = (sourceNode: RepoNode<Content>) =>
    Object.keys(sourceNode).reduce<Record<string, unknown>>((restorableData, key) => {
        if (!NON_RESTORABLE_NODE_KEYS.includes(key)) {
            restorableData[key] = (sourceNode as unknown as Record<string, unknown>)[key];
        }
        return restorableData;
    }, {});

const jsonResponse = (status: number, body: Record<string, unknown>) => ({
    status,
    contentType: 'application/json',
    body,
});

const getParents = (project: Project) =>
    project.parents.length > 0 ? project.parents : project.parent ? [project.parent] : [];

const validateProjects = (projects: Project[]) => {
    if (projects.length !== REQUIRED_PROJECTS.length) {
        throw new Error(`Expected ${REQUIRED_PROJECTS.length} projects, got ${projects.length}`);
    }

    REQUIRED_PROJECTS.forEach((expectedProject, index) => {
        const project = projects[index];
        const parents = getParents(project);
        if (
            project.id !== expectedProject.id ||
            project.language !== expectedProject.language ||
            parents.length !== expectedProject.parents.length ||
            parents.some((parent, parentIndex) => parent !== expectedProject.parents[parentIndex])
        ) {
            throw new Error(`Project topology mismatch for expected project "${expectedProject.id}"`);
        }
    });
};

const comparableProject = (project: Project) => ({
    id: project.id,
    displayName: project.displayName,
    description: project.description || '',
    language: project.language,
    parents: getParents(project),
    siteConfig: project.siteConfig || [],
    permissions: project.permissions || {},
    readAccess: project.readAccess || {},
});

const configureDefaultProject = (project: Project) => {
    try {
        projectLib.modify({
            id: project.id,
            displayName: project.displayName,
            description: project.description,
            language: project.language,
            siteConfig: project.siteConfig || [],
        });
    } catch (error) {
        if (String(error).indexOf('Default project has no roles') === -1) {
            throw error;
        }
    }

    const configuredProject = projectLib.get({ id: project.id });
    if (!configuredProject) {
        throw new Error('Default project was not found after configuration');
    }

    const expected = comparableProject({ ...project, permissions: undefined, readAccess: undefined });
    const actual = comparableProject({
        ...configuredProject,
        permissions: undefined,
        readAccess: undefined,
    });
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Default project verification failed: ${JSON.stringify(actual)}`);
    }
};

const configureChildProject = (project: Project) => {
    const existingProject = projectLib.get({ id: project.id });
    if (existingProject) {
        projectLib.modify({
            id: project.id,
            displayName: project.displayName,
            description: project.description,
            language: project.language,
            siteConfig: project.siteConfig || [],
        });
        const configuredProject = projectLib.get({ id: project.id });
        if (
            !configuredProject ||
            JSON.stringify(comparableProject(configuredProject)) !== JSON.stringify(comparableProject(project))
        ) {
            throw new Error(`Existing project "${project.id}" does not match the manifest`);
        }
        return;
    }

    projectLib.create({
        id: project.id,
        displayName: project.displayName,
        description: project.description,
        language: project.language,
        parents: getParents(project),
        siteConfig: project.siteConfig || [],
        permissions: project.permissions,
        readAccess: { public: Boolean((project.readAccess as { public?: boolean })?.public) },
    });

    const configuredProject = projectLib.get({ id: project.id });
    if (
        !configuredProject ||
        JSON.stringify(comparableProject(configuredProject)) !== JSON.stringify(comparableProject(project))
    ) {
        throw new Error(`Created project "${project.id}" does not match the manifest`);
    }
};

const configureProjects = (projects: Project[]) => {
    validateProjects(projects);
    configureDefaultProject(projects[0]);
    projects.slice(1).forEach(configureChildProject);
    return projects.map(({ id }) => projectLib.get({ id }));
};

const validateApplications = (applications: RequiredApplication[]) => {
    applications.filter(({ required }) => required !== false).forEach((expectedApplication) => {
        if (!expectedApplication.installed || !expectedApplication.started || !expectedApplication.version) {
            throw new Error(
                `Source application "${expectedApplication.key}" was not installed, started, and versioned`
            );
        }
        const application = appLib.get({ key: expectedApplication.key });
        if (!application) {
            throw new Error(`Required application "${expectedApplication.key}" is not installed`);
        }
        if (!application.started) {
            throw new Error(`Required application "${expectedApplication.key}" is not started`);
        }
        if (application.version !== expectedApplication.version) {
            throw new Error(
                `Required application "${expectedApplication.key}" has version "${application.version}", expected "${expectedApplication.version}"`
            );
        }
    });
};

const getParentPath = (path: string) => path.slice(0, path.lastIndexOf('/'));

const prepareProjectImport = (
    repository: string,
    branch: 'draft' | 'master',
    entries: ImportEntry[]
) => {
    if (!REQUIRED_CHILD_REPO_IDS.includes(repository)) {
        throw new Error(`Only child project repositories may be prepared: ${repository}`);
    }
    if (entries.some((entry) => entry.repoId !== repository || !entry.branches.includes(branch))) {
        throw new Error(`Import entries do not match ${repository}:${branch}`);
    }

    return runInContext({ repository, branch, asAdmin: true }, () => {
        const connection = getRepoConnection({ repoId: repository, branch, asAdmin: true });
        let relocatedExistingContents = 0;
        const deferredRelocations: string[] = [];
        entries
            .slice()
            .sort((left, right) => left.paths[branch]!.length - right.paths[branch]!.length)
            .forEach((entry) => {
                const expectedPath = entry.paths[branch];
                if (!expectedPath) {
                    throw new Error(`Import entry ${entry.contentId} has no ${branch} path`);
                }
                const pathCollision = connection.get<Content>(expectedPath);
                if (pathCollision && pathCollision._id !== entry.contentId) {
                    const temporaryPath = `${expectedPath}${COLLISION_PATH_SUFFIX}`;
                    const previousTemporaryCollision = connection.get<Content>(temporaryPath);
                    if (previousTemporaryCollision) {
                        connection.delete(previousTemporaryCollision._id);
                    }
                    const movedCollision = connection.move({
                        source: pathCollision._id,
                        target: temporaryPath,
                    });
                    if (!movedCollision) {
                        throw new Error(
                            `Could not relocate inherited path collision ${pathCollision._id}`
                        );
                    }
                    relocatedExistingContents += 1;
                }
                const existingContent = connection.get<Content>(entry.contentId);
                if (!existingContent || existingContent._path === expectedPath) {
                    return;
                }
                if (!connection.get<Content>(getParentPath(expectedPath))) {
                    deferredRelocations.push(entry.contentId);
                    return;
                }

                const moved = connection.move({
                    source: entry.contentId,
                    target: expectedPath,
                });
                const movedContent = connection.get<Content>(entry.contentId);
                if (!moved || !movedContent || movedContent._path !== expectedPath) {
                    throw new Error(
                        `Could not relocate child-layer content ${entry.contentId} to ${expectedPath}`
                    );
                }
                relocatedExistingContents += 1;
            });
        return {
            relocatedInheritedCollisions: relocatedExistingContents,
            deferredRelocations,
        };
    });
};

const restoreSupplements = (
    repository: string,
    branch: 'draft' | 'master',
    supplements: ImportSupplement[]
) => {
    if (
        supplements.some(
            ({ repoId, branch: supplementBranch }) =>
                repoId !== repository || supplementBranch !== branch
        )
    ) {
        throw new Error(`Import supplements do not match ${repository}:${branch}`);
    }

    return runInContext({ repository, branch, asAdmin: true }, () => {
        const connection = getRepoConnection({ repoId: repository, branch, asAdmin: true });
        return supplements.map((supplement) => {
            const sourceNode = supplement.node;
            const content = connection.get<Content>(supplement.contentId);
            let restoredNode: RepoNode<Content>;
            if (!content) {
                const pathCollision = connection.get<Content>(supplement.contentPath);
                if (pathCollision && pathCollision._id !== supplement.contentId) {
                    connection.delete(supplement.contentPath);
                }
                const parentPath = getParentPath(supplement.contentPath);
                if (!connection.get<Content>(parentPath)) {
                    throw new Error(
                        `Parent ${parentPath} is missing for native supplement ${supplement.contentId}`
                    );
                }
                restoredNode = connection.create<Content>({
                    ...getRestorableNodeData(sourceNode),
                    _id: supplement.contentId,
                    _name: sourceNode._name,
                    _parentPath: parentPath,
                } as never);
            } else {
                restoredNode = connection.modify<Content>({
                    key: supplement.contentId,
                    editor: (targetNode) => {
                        const restorableData = getRestorableNodeData(sourceNode);
                        Object.keys(restorableData).forEach((key) => {
                            (targetNode as unknown as Record<string, unknown>)[key] =
                                restorableData[key];
                        });
                        return targetNode;
                    },
                });
            }
            if (restoredNode._id !== supplement.contentId || restoredNode._path !== supplement.contentPath) {
                throw new Error(`Supplement verification failed for ${repository}:${branch}:${supplement.contentId}`);
            }
            return {
                contentId: restoredNode._id,
                contentPath: restoredNode._path,
                invalidValuePaths: supplement.invalidValuePaths,
            };
        });
    });
};

const normalizeImportPaths = (
    repository: string,
    branch: 'draft' | 'master',
    entries: ImportEntry[]
) => {
    if (!REQUIRED_REPO_IDS.includes(repository)) {
        throw new Error(`Unexpected import repository: ${repository}`);
    }
    return runInContext({ repository, branch, asAdmin: true }, () => {
        const connection = getRepoConnection({ repoId: repository, branch, asAdmin: true });
        let normalizedPaths = 0;
        entries
            .slice()
            .sort((left, right) => left.paths[branch]!.length - right.paths[branch]!.length)
            .forEach((entry) => {
                const expectedPath = entry.paths[branch];
                if (!expectedPath) {
                    throw new Error(`Import entry ${entry.contentId} has no ${branch} path`);
                }
                const temporaryCollision = connection.get<Content>(
                    `${expectedPath}${COLLISION_PATH_SUFFIX}`
                );
                if (temporaryCollision) {
                    connection.delete(temporaryCollision._id);
                }
                const content = connection.get<Content>(entry.contentId);
                if (!content || content._path === expectedPath) {
                    return;
                }
                const moved = connection.move({
                    source: entry.contentId,
                    target: expectedPath,
                });
                const movedContent = connection.get<Content>(entry.contentId);
                if (!moved || !movedContent || movedContent._path !== expectedPath) {
                    throw new Error(`Path normalization failed for ${repository}:${branch}:${entry.contentId}`);
                }
                normalizedPaths += 1;
            });
        return normalizedPaths;
    });
};

const containsInvalidXmlCharacter = (value: unknown): boolean => {
    if (typeof value === 'string') {
        for (let index = 0; index < value.length; index += 1) {
            const code = value.charCodeAt(index);
            if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) {
                return true;
            }
        }
        return false;
    }
    if (Array.isArray(value)) {
        return value.some(containsInvalidXmlCharacter);
    }
    if (value && Object.prototype.toString.call(value) === '[object Object]') {
        return Object.keys(value).some((key) =>
            containsInvalidXmlCharacter((value as Record<string, unknown>)[key])
        );
    }
    return false;
};

const validateImport = (entries: ImportEntry[], supplements: ImportSupplement[]) => {
    const errors: string[] = [];
    let missingEntries = 0;
    let pathMismatches = 0;
    REQUIRED_REPO_IDS.forEach((repository) => {
        (['draft', 'master'] as const).forEach((branch) => {
            const branchEntries = entries.filter(
                (entry) => entry.repoId === repository && entry.branches.includes(branch)
            );
            const connection = getRepoConnection({ repoId: repository, branch, asAdmin: true });
            runInContext({ repository, branch, asAdmin: true }, () => {
                branchEntries.forEach((entry) => {
                    const content = connection.get<Content>(entry.contentId);
                    const expectedPath = entry.paths[branch];
                    if (!content) {
                        missingEntries += 1;
                        if (errors.length < 20) {
                            const pathCollision = expectedPath
                                ? connection.get<Content>(expectedPath)
                                : null;
                            errors.push(
                                `missing:${repository}:${branch}:${entry.contentId}:collision:${pathCollision?._id || 'none'}`
                            );
                        }
                    } else if (content._path !== expectedPath) {
                        pathMismatches += 1;
                        if (errors.length < 20) {
                            errors.push(
                                `path:${repository}:${branch}:${entry.contentId}:${content._path}:${expectedPath}`
                            );
                        }
                    }
                });
            });
            supplements
                .filter((supplement) => supplement.repoId === repository && supplement.branch === branch)
                .forEach((supplement) => {
                    const node = connection.get<Content>(supplement.contentId);
                    if (
                        !node ||
                        node._path !== supplement.contentPath ||
                        containsInvalidXmlCharacter(node)
                    ) {
                        if (errors.length < 20) {
                            errors.push(`supplement:${repository}:${branch}:${supplement.contentId}`);
                        }
                    }
                });
        });
    });
    return {
        checkedEntries: entries.reduce((total, entry) => total + entry.branches.length, 0),
        checkedSupplements: supplements.length,
        missingEntries,
        pathMismatches,
        errors,
        projects: REQUIRED_PROJECTS.map(({ id }) => {
            const project = projectLib.get({ id });
            return { id, displayName: project?.displayName || null };
        }),
        officeSchedules: [
            'office_import_schedule',
            'legacy_office_import_schedule',
        ].map((name) => ({
            name,
            enabled: schedulerLib.get({ name })?.enabled ?? false,
        })),
    };
};

export const post = (req: Request) => {
    if (!userCanManageCuratedExports()) {
        return jsonResponse(403, { message: 'System administrator access is required' });
    }
    if (!req.body) {
        return jsonResponse(400, { message: 'A JSON request body is required' });
    }

    try {
        const body = JSON.parse(req.body) as RequestBody;
        if (body.action === 'configure-login') {
            return jsonResponse(200, configureLogin());
        }
        if (
            body.action === 'configure-projects' &&
            Array.isArray(body.applications) &&
            Array.isArray(body.projects)
        ) {
            validateApplications(body.applications);
            return jsonResponse(200, { projects: configureProjects(body.projects) });
        }
        if (
            body.action === 'prepare-project-import' &&
            typeof body.repository === 'string' &&
            (body.branch === 'draft' || body.branch === 'master') &&
            Array.isArray(body.entries)
        ) {
            return jsonResponse(
                200,
                prepareProjectImport(body.repository, body.branch, body.entries)
            );
        }
        if (
            body.action === 'normalize-import-paths' &&
            typeof body.repository === 'string' &&
            (body.branch === 'draft' || body.branch === 'master') &&
            Array.isArray(body.entries)
        ) {
            return jsonResponse(200, {
                normalizedPaths: normalizeImportPaths(body.repository, body.branch, body.entries),
            });
        }
        if (
            body.action === 'restore-supplements' &&
            typeof body.repository === 'string' &&
            (body.branch === 'draft' || body.branch === 'master') &&
            Array.isArray(body.supplements)
        ) {
            return jsonResponse(200, {
                restoredSupplements: restoreSupplements(
                    body.repository,
                    body.branch,
                    body.supplements
                ),
            });
        }
        if (
            body.action === 'validate-import' &&
            Array.isArray(body.entries) &&
            Array.isArray(body.supplements)
        ) {
            const validation = validateImport(body.entries, body.supplements);
            return jsonResponse(
                validation.missingEntries === 0 && validation.pathMismatches === 0 && validation.errors.length === 0
                    ? 200
                    : 409,
                validation
            );
        }
        return jsonResponse(400, { message: 'Invalid curated export import action or payload' });
    } catch (error) {
        logger.error(`Curated export import failed: ${error}`);
        return jsonResponse(500, { message: `Curated export import failed: ${error}` });
    }
};

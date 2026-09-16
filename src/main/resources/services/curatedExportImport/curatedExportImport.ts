import { Request } from '@enonic-types/core';
import { userCanManageCuratedExports } from '../../lib/utils/auth-utils';
import * as appLib from '/lib/xp/app';
import * as authLib from '/lib/xp/auth';
import * as nodeLib from '/lib/xp/node';
import * as projectLib from '/lib/xp/project';
import { Project } from '/lib/xp/project';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { runInContext } from '../../lib/context/run-in-context';
import { logger } from '../../lib/utils/logging';
import { getRepoConnection } from '../../lib/repos/repo-utils';
import {
    CuratedTargetExpectation,
    repairCuratedTargetBatch,
    validateCuratedTargetBatch,
} from '../../lib/exports/target/curated-target-fidelity';
import {
    isCuratedBranch,
    isCuratedContentId,
    isCuratedContentPath,
    isCuratedImportEnabled,
    isCuratedRepository,
    REQUIRED_PROJECTS,
} from '../../lib/exports/curated-safety';

const MAX_RELOCATION_ENTRIES = 20000;
const MAX_RELOCATION_DESCENDANTS = 1000;

type ImportEntry = {
    contentId: string;
    paths: Partial<Record<'draft' | 'master', string>>;
    repoId: string;
    branches: Array<'draft' | 'master'>;
};

type RequestBody = {
    action?: 'configure-login' | 'configure-projects' | 'prepare-project-import' | 'normalize-import-paths' | 'repair-metadata' | 'validate-fidelity' | 'synchronize-published';
    applications?: RequiredApplication[];
    projects?: Project[];
    repository?: string;
    branch?: 'draft' | 'master';
    entries?: ImportEntry[];
    scope?: 'full' | 'page';
    expectations?: CuratedTargetExpectation[];
    absentContentIds?: string[];
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

type RequiredApplication = {
    key: string;
    version: string | null;
    installed: boolean;
    started: boolean;
    required?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const isPrincipalKey = (value: unknown) =>
    typeof value === 'string' &&
    /^(role:[a-zA-Z0-9._-]+|(user|group):[a-zA-Z0-9._-]+:[^:\s/\\]+)$/.test(value);

const isProjectPermissions = (value: unknown) =>
    isRecord(value) &&
    Object.keys(value).every(
        (role) =>
            ['owner', 'editor', 'author', 'contributor', 'viewer'].includes(role) &&
            Array.isArray(value[role]) &&
            value[role].every(isPrincipalKey)
    );

const isProjectReadAccess = (value: unknown) =>
    isRecord(value) &&
    Object.keys(value).every((key) => key === 'public' && typeof value[key] === 'boolean');

const hasUnsafeProperty = (value: unknown): boolean => {
    if (Array.isArray(value)) {
        return value.some(hasUnsafeProperty);
    }
    return (
        isRecord(value) &&
        Object.keys(value).some(
            (key) =>
                ['__proto__', 'prototype', 'constructor'].includes(key) ||
                hasUnsafeProperty(value[key])
        )
    );
};

const isImportEntry = (value: unknown): value is ImportEntry => {
    if (
        !isRecord(value) ||
        !isCuratedRepository(value.repoId) ||
        !isCuratedContentId(value.contentId) ||
        !isRecord(value.paths) ||
        !Array.isArray(value.branches) ||
        value.branches.length === 0 ||
        value.branches.length > 2 ||
        value.branches.some((branch) => !isCuratedBranch(branch))
    ) {
        return false;
    }
    const paths = value.paths;
    const branches = value.branches;
    return (
        Object.keys(paths).every(
            (branch) =>
                isCuratedBranch(branch) &&
                branches.includes(branch) &&
                isCuratedContentPath(paths[branch])
        ) &&
        branches.every((branch) => isCuratedContentPath(paths[branch]))
    );
};

const hasDuplicateTargets = (entries: ImportEntry[]) => {
    const ids = new Set<string>();
    const paths = new Set<string>();
    return entries.some((entry) => {
        return entry.branches.some((branch) => {
            const id = `${entry.repoId}:${branch}:${entry.contentId}`;
            const path = `${entry.repoId}:${branch}:${entry.paths[branch]}`;
            if (ids.has(id) || paths.has(path)) {
                return true;
            }
            ids.add(id);
            paths.add(path);
            return false;
        });
    });
};

const validateRequest = (body: RequestBody) => {
    if (!isRecord(body) || hasUnsafeProperty(body)) {
        throw new Error('Invalid request object');
    }
    if (
        (body.repository !== undefined && !isCuratedRepository(body.repository)) ||
        (body.branch !== undefined && !isCuratedBranch(body.branch)) ||
        (body.scope !== undefined && body.scope !== 'full' && body.scope !== 'page')
    ) {
        throw new Error('Invalid import repository or branch');
    }
    if (
        body.entries !== undefined &&
        (!Array.isArray(body.entries) ||
            !body.entries.every(isImportEntry) ||
            hasDuplicateTargets(body.entries))
    ) {
        throw new Error('Invalid import entries');
    }
    if (
        body.repository &&
        body.branch &&
        body.entries?.some(
            (entry) =>
                entry.repoId !== body.repository || !entry.branches.includes(body.branch!)
        )
    ) {
        throw new Error('Import items do not match the requested repository and branch');
    }
};

const assertContentOwnership = (
    node: RepoNode<Content> | null,
    contentId?: string,
    contentPath?: string
) => {
    if (
        node &&
        (!isCuratedContentPath(node._path) ||
            (node._nodeType !== undefined && node._nodeType !== 'content') ||
            (contentId !== undefined && node._id !== contentId) ||
            (contentPath !== undefined && node._path !== contentPath))
    ) {
        throw new Error('The target node does not belong to the selected content');
    }
};

const getSelectedDescendantIds = (
    connection: ReturnType<typeof getRepoConnection>,
    content: RepoNode<Content>,
    selectedIds: Set<string>
) => {
    const result = connection.findChildren({
        parentKey: content._id,
        recursive: true,
        start: 0,
        count: MAX_RELOCATION_DESCENDANTS + 1,
    });
    if (
        !result ||
        typeof result.total !== 'number' ||
        !Number.isFinite(result.total) ||
        result.total % 1 !== 0 ||
        result.total < 0 ||
        result.total > MAX_RELOCATION_DESCENDANTS ||
        result.hits.length !== result.total
    ) {
        throw new Error(`Cannot completely inspect descendants of ${content._id}; limit is ${MAX_RELOCATION_DESCENDANTS}`);
    }
    const ids = new Set<string>();
    result.hits.forEach(({ id }) => {
        if (!selectedIds.has(id) || ids.has(id) || id === content._id) {
            throw new Error(`Cannot relocate ${content._id}: unselected or inconsistent descendant ${id}`);
        }
        const descendant = connection.get<Content>(id);
        assertContentOwnership(descendant, id);
        if (!descendant?._path.startsWith(`${content._path}/`)) {
            throw new Error(`Cannot verify descendant ${id} of ${content._id}`);
        }
        ids.add(id);
    });
    return ids;
};

const jsonResponse = (status: number, body: Record<string, unknown>) => ({
    status,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'no-store' },
    body,
});

const getParents = (project: Project) => {
    if (project.parents.length > 0) {
        return project.parents;
    }
    return project.parent ? [project.parent] : [];
};

const validateProjects = (projects: Project[]) => {
    if (projects.length !== REQUIRED_PROJECTS.length) {
        throw new Error(`Expected ${REQUIRED_PROJECTS.length} projects, got ${projects.length}`);
    }

    REQUIRED_PROJECTS.forEach((expectedProject, index) => {
        const project = projects[index];
        if (
            !isRecord(project) ||
            !Array.isArray(project.parents) ||
            project.parents.some((parent) => typeof parent !== 'string') ||
            typeof project.displayName !== 'string' ||
            (project.description !== undefined && typeof project.description !== 'string') ||
            (project.siteConfig !== undefined &&
                (!Array.isArray(project.siteConfig) ||
                    project.siteConfig.some(
                        (config) =>
                            !isRecord(config) ||
                            typeof config.applicationKey !== 'string' ||
                            (config.config !== undefined && !isRecord(config.config))
                    ))) ||
            (project.permissions !== undefined &&
                !isProjectPermissions(project.permissions)) ||
            (project.readAccess !== undefined &&
                !isProjectReadAccess(project.readAccess))
        ) {
            throw new Error(`Invalid project configuration for "${expectedProject.id}"`);
        }
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
        if (!String(error).includes('Default project has no roles')) {
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
    projects.slice(1).forEach((project) => {
        const existingProject = projectLib.get({ id: project.id });
        if (
            existingProject &&
            (JSON.stringify(getParents(existingProject)) !== JSON.stringify(getParents(project)) ||
                JSON.stringify(existingProject.permissions || {}) !==
                    JSON.stringify(project.permissions || {}) ||
                JSON.stringify(existingProject.readAccess || {}) !==
                    JSON.stringify(project.readAccess || {}))
        ) {
            throw new Error(`Existing project "${project.id}" has incompatible topology or access`);
        }
    });
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

type RelocationEntry = {
    contentId: string;
    targetPath: string;
    content: RepoNode<Content> | null;
};

type Relocation = {
    contentId: string;
    sourcePath: string;
    targetPath: string;
    affected: Array<{ contentId: string; targetPath: string }>;
};

const orderRelocationEntries = (entries: RelocationEntry[]) => {
    const entriesById = new Map(entries.map((entry) => [entry.contentId, entry]));
    const sourceIds = new Map<string, string>();
    const targetIds = new Map<string, string>();
    entries.forEach((entry) => {
        if (entry.content) {
            sourceIds.set(entry.content._path, entry.contentId);
        }
        targetIds.set(entry.targetPath, entry.contentId);
    });
    const nearestAncestor = (path: string, ids: Map<string, string>) => {
        let parentPath = getParentPath(path);
        while (parentPath) {
            const id = ids.get(parentPath);
            if (id) {
                return id;
            }
            parentPath = getParentPath(parentPath);
        }
        return null;
    };
    const ordered: RelocationEntry[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (entry: RelocationEntry) => {
        if (visited.has(entry.contentId)) {
            return;
        }
        if (visiting.has(entry.contentId)) {
            throw new Error('Cannot safely order conflicting source and destination subtrees');
        }
        visiting.add(entry.contentId);
        const ancestors = [
            entry.content ? nearestAncestor(entry.content._path, sourceIds) : null,
            nearestAncestor(entry.targetPath, targetIds),
        ];
        ancestors.forEach((id) => {
            if (id) {
                visit(entriesById.get(id)!);
            }
        });
        visiting.delete(entry.contentId);
        visited.add(entry.contentId);
        ordered.push(entry);
    };
    entries.slice().sort((left, right) => left.targetPath.length - right.targetPath.length).forEach(visit);
    return ordered;
};

const planImportRelocations = (
    connection: ReturnType<typeof getRepoConnection>,
    branch: 'draft' | 'master',
    entries: ImportEntry[],
    allowMissing: boolean
) => {
    connection.refresh('SEARCH');
    const selectedIds = new Set(entries.map(({ contentId }) => contentId));
    const positions = new Map<string, string>();
    const idsAtPaths = new Map<string, string>();
    const selected = entries.map((entry) => {
        const content = connection.get<Content>(entry.contentId);
        assertContentOwnership(content, entry.contentId);
        if (!content && !allowMissing) {
            throw new Error(`Native-imported selected content is missing: ${entry.contentId}`);
        }
        if (content) {
            if (idsAtPaths.has(content._path)) {
                throw new Error(`Selected IDs have conflicting current paths: ${content._path}`);
            }
            positions.set(entry.contentId, content._path);
            idsAtPaths.set(content._path, entry.contentId);
        }
        return { contentId: entry.contentId, targetPath: entry.paths[branch]!, content };
    });
    const occupantAt = (path: string) => {
        const selectedId = idsAtPaths.get(path);
        if (selectedId) {
            return selectedId;
        }
        const node = connection.get<Content>(path);
        if (path !== '/content') {
            assertContentOwnership(node, undefined, path);
        }
        // A selected node may already have vacated this stored path in the simulated plan.
        return node && !selectedIds.has(node._id) ? node._id : null;
    };
    const relocations: Relocation[] = [];
    const deferredRelocations: string[] = [];
    orderRelocationEntries(selected).forEach((entry) => {
        const occupant = occupantAt(entry.targetPath);
        if (occupant && occupant !== entry.contentId) {
            throw new Error(`Cannot relocate ${entry.contentId}: target ${entry.targetPath} is occupied by ${occupant}; no content will be deleted`);
        }
        const sourcePath = positions.get(entry.contentId);
        if (!entry.content || !sourcePath || sourcePath === entry.targetPath) {
            return;
        }
        if (entry.targetPath.startsWith(`${sourcePath}/`)) {
            throw new Error(`Cannot move ${entry.contentId} into its own subtree`);
        }
        getSelectedDescendantIds(connection, entry.content, selectedIds);
        if (!occupantAt(getParentPath(entry.targetPath))) {
            if (!allowMissing) {
                throw new Error(`Destination parent is missing for selected content ${entry.contentId}`);
            }
            deferredRelocations.push(entry.contentId);
            return;
        }
        const affected: Relocation['affected'] = [];
        positions.forEach((path, contentId) => {
            if (path === sourcePath || path.startsWith(`${sourcePath}/`)) {
                affected.push({ contentId, targetPath: `${entry.targetPath}${path.slice(sourcePath.length)}` });
            }
        });
        affected.forEach(({ contentId }) => idsAtPaths.delete(positions.get(contentId)!));
        affected.forEach(({ contentId, targetPath }) => {
            positions.set(contentId, targetPath);
            idsAtPaths.set(targetPath, contentId);
        });
        relocations.push({ contentId: entry.contentId, sourcePath, targetPath: entry.targetPath, affected });
    });
    selected.forEach((entry) => {
        if (
            entry.content &&
            positions.get(entry.contentId) !== entry.targetPath &&
            !deferredRelocations.includes(entry.contentId)
        ) {
            throw new Error(`Relocation would displace selected content ${entry.contentId} from its required path`);
        }
    });
    return { relocations, deferredRelocations, selectedIds };
};

const relocateImportPaths = (
    repository: string,
    branch: 'draft' | 'master',
    entries: ImportEntry[],
    allowMissing: boolean
) => {
    if (
        !isCuratedRepository(repository) ||
        !isCuratedBranch(branch) ||
        entries.length > MAX_RELOCATION_ENTRIES ||
        entries.some((entry) => entry.repoId !== repository || !entry.branches.includes(branch))
    ) {
        throw new Error(`Invalid relocation batch for ${repository}:${branch}`);
    }

    return runInContext({ repository, branch, asAdmin: true }, () => {
        const connection = getRepoConnection({ repoId: repository, branch, asAdmin: true });
        // Validate every planned subtree effect before starting XP's non-transactional moves.
        const plan = planImportRelocations(connection, branch, entries, allowMissing);
        plan.relocations.forEach((relocation) => {
            connection.refresh('SEARCH');
            const content = connection.get<Content>(relocation.contentId);
            assertContentOwnership(content, relocation.contentId, relocation.sourcePath);
            if (!content) {
                throw new Error(`Selected content disappeared before relocation: ${relocation.contentId}`);
            }
            const target = connection.get<Content>(relocation.targetPath);
            const parentPath = getParentPath(relocation.targetPath);
            const parent = connection.get<Content>(parentPath);
            if (parentPath !== '/content') {
                assertContentOwnership(parent, undefined, parentPath);
            }
            if (target || !parent) {
                throw new Error(`Destination changed before relocation of ${relocation.contentId}`);
            }
            const descendants = getSelectedDescendantIds(connection, content, plan.selectedIds);
            if (
                descendants.size !== relocation.affected.length - 1 ||
                relocation.affected.some(
                    ({ contentId }) => contentId !== relocation.contentId && !descendants.has(contentId)
                )
            ) {
                throw new Error(`Subtree changed before relocation of ${relocation.contentId}`);
            }
            if (!connection.move({ source: relocation.contentId, target: relocation.targetPath })) {
                throw new Error(`Could not relocate selected content ${relocation.contentId}`);
            }
            relocation.affected.forEach(({ contentId, targetPath }) => {
                const moved = connection.get<Content>(contentId);
                assertContentOwnership(moved, contentId, targetPath);
                if (!moved) {
                    throw new Error(`Selected content disappeared during relocation: ${contentId}`);
                }
            });
        });
        return {
            relocatedPaths: plan.relocations.length,
            deferredRelocations: plan.deferredRelocations,
        };
    });
};

const prepareProjectImport = (
    repository: string,
    branch: 'draft' | 'master',
    entries: ImportEntry[]
) => {
    const result = relocateImportPaths(repository, branch, entries, true);
    return {
        relocatedInheritedCollisions: result.relocatedPaths,
        deferredRelocations: result.deferredRelocations,
    };
};

const normalizeImportPaths = (
    repository: string,
    branch: 'draft' | 'master',
    entries: ImportEntry[]
) => relocateImportPaths(repository, branch, entries, false).relocatedPaths;

const synchronizePublished = (repository: string, entries: ImportEntry[]) => {
    if (
        !isCuratedRepository(repository) ||
        entries.length > MAX_RELOCATION_ENTRIES ||
        entries.some(
            (entry) =>
                entry.repoId !== repository ||
                !entry.branches.includes('draft') ||
                !entry.branches.includes('master')
        )
    ) {
        throw new Error(`Invalid published synchronization batch for ${repository}`);
    }

    return runInContext({ repository, branch: 'draft', asAdmin: true }, () => {
        const connection = getRepoConnection({ repoId: repository, branch: 'draft', asAdmin: true });
        let synchronizedEntries = 0;
        for (let start = 0; start < entries.length; start += 100) {
            const batch = entries.slice(start, start + 100);
            batch.forEach((entry) => {
                const content = connection.get<Content>(entry.contentId);
                assertContentOwnership(content, entry.contentId, entry.paths.draft);
                if (!content) {
                    throw new Error(`Selected draft content is missing: ${entry.contentId}`);
                }
            });
            const result = connection.push({
                keys: batch.map(({ contentId }) => contentId),
                target: 'master',
                resolve: false,
            });
            if (result.failed.length > 0 || result.success.length !== batch.length) {
                throw new Error(
                    `Could not synchronize published content: ${JSON.stringify(result.failed)}`
                );
            }
            synchronizedEntries += batch.length;
        }
        return synchronizedEntries;
    });
};

const getImportAccessError = () => {
    if (!userCanManageCuratedExports()) {
        return jsonResponse(403, { message: 'System administrator access is required' });
    }
    if (!isCuratedImportEnabled()) {
        return jsonResponse(403, {
            message: 'Curated import requires an explicitly enabled localhost sandbox',
        });
    }
    return null;
};

export const get = () => ({
    ...(getImportAccessError() ||
        jsonResponse(200, {
            environment: 'localhost',
            importEnabled: true,
            importFormatVersion: 2,
            importInProgress: app.config.curatedImportInProgress === 'true',
        })),
    headers: { 'Cache-Control': 'no-store' },
});

export const post = (req: Request) => {
    const accessError = getImportAccessError();
    if (accessError) {
        return accessError;
    }
    if (!req.body) {
        return jsonResponse(400, { message: 'A JSON request body is required' });
    }

    let body: RequestBody;
    try {
        body = JSON.parse(req.body) as RequestBody;
        validateRequest(body);
        if (body.action === 'configure-projects' && Array.isArray(body.projects)) {
            validateProjects(body.projects);
        }
    } catch (error) {
        return jsonResponse(400, { message: `Invalid curated import request: ${error}` });
    }

    try {
        if (
            (body.action === 'repair-metadata' || body.action === 'validate-fidelity') &&
            body.repository &&
            body.branch &&
            body.scope &&
            Array.isArray(body.expectations)
        ) {
            const batch = {
                repository: body.repository,
                branch: body.branch,
                scope: body.scope,
                expectations: body.expectations,
                absentContentIds: body.absentContentIds,
            };
            const result = body.action === 'repair-metadata'
                ? repairCuratedTargetBatch(batch)
                : validateCuratedTargetBatch(batch);
            return jsonResponse(200, result);
        }
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
            body.action === 'synchronize-published' &&
            typeof body.repository === 'string' &&
            Array.isArray(body.entries)
        ) {
            return jsonResponse(200, {
                synchronizedPublished: synchronizePublished(body.repository, body.entries),
            });
        }
        return jsonResponse(400, { message: 'Invalid curated export import action or payload' });
    } catch (error) {
        logger.error(`Curated export import failed: ${error}`);
        return jsonResponse(500, { message: `Curated export import failed: ${error}` });
    }
};

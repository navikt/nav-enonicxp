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
} from '../../lib/exports/curated-safety';

const REQUIRED_PROJECTS = [
    { id: 'default', language: 'no', parents: [] },
    { id: 'navno-engelsk', language: 'en', parents: ['default'] },
    { id: 'navno-nynorsk', language: 'nn', parents: ['default'] },
] as const;
const REQUIRED_REPO_IDS = REQUIRED_PROJECTS.map(({ id }) => `com.enonic.cms.${id}`);
const MAX_RELOCATION_ENTRIES = 20000;
const MAX_RELOCATION_DESCENDANTS = 1000;

type ImportEntry = {
    contentId: string;
    paths: Partial<Record<'draft' | 'master', string>>;
    repoId: string;
    branches: Array<'draft' | 'master'>;
};

type RequestBody = {
    action?: 'configure-login' | 'configure-projects' | 'prepare-project-import' | 'normalize-import-paths' | 'restore-supplements' | 'validate-import' | 'repair-metadata' | 'validate-fidelity';
    applications?: RequiredApplication[];
    projects?: Project[];
    repository?: string;
    branch?: 'draft' | 'master';
    entries?: ImportEntry[];
    supplements?: ImportSupplement[];
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

const SUPPLEMENT_NODE_KEYS = [
    '_childOrder',
    '_inheritsPermissions',
    '_manualOrderValue',
    '_permissions',
    '_indexConfig',
    'displayName',
    'type',
    'data',
    'x',
    'page',
    'fragment',
    'components',
    'language',
    'creator',
    'modifier',
    'owner',
    'createdTime',
    'modifiedTime',
    'originProject',
    'childOrder',
    'workflow',
    'inherit',
    'variantOf',
];
const READ_ONLY_NODE_KEYS = [
    '_id',
    '_name',
    '_path',
    '_versionKey',
    '_ts',
    '_state',
    '_nodeType',
    'attachment',
    'attachments',
    'hasChildren',
    'valid',
    'publish',
    'processedReferences',
    'validationErrors',
    'originalName',
    'originalParentPath',
    'archivedTime',
    'archivedBy',
];

const RESTORABLE_TEXT_ROOTS = [
    'displayName',
    'data',
    'x',
    'page',
    'fragment',
    'components',
    'language',
    'workflow',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const parseStringLeafPath = (path: string): Array<string | number> | null => {
    if (!/^[^.[\]]+(?:\.[^.[\]]+|\[(?:0|[1-9][0-9]*)\])*$/.test(path)) {
        return null;
    }
    const segments = (path.match(/[^.[\]]+|\[\d+\]/g) || []).map((segment) =>
        segment.startsWith('[') ? Number(segment.slice(1, -1)) : segment
    );
    if (
        !RESTORABLE_TEXT_ROOTS.includes(segments[0] as string) ||
        segments.some((segment) =>
            typeof segment === 'number'
                ? segment >= 4294967295
                : ['__proto__', 'prototype', 'constructor'].includes(segment)
        )
    ) {
        return null;
    }
    return segments;
};

const getStringLeaf = (node: unknown, segments: Array<string | number>) => {
    let parent: unknown = node;
    for (let index = 0; index < segments.length; index += 1) {
        const key = segments[index];
        if (
            (typeof key === 'number' ? !Array.isArray(parent) : !isRecord(parent)) ||
            !Object.prototype.hasOwnProperty.call(parent, key)
        ) {
            return null;
        }
        const object = parent as Record<string | number, unknown>;
        const value = object[key];
        if (index === segments.length - 1) {
            return typeof value === 'string' ? { parent: object, key, value } : null;
        }
        parent = value;
    }
    return null;
};

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

const isNodePermissions = (value: unknown) =>
    Array.isArray(value) &&
    value.every(
        (permission) =>
            isRecord(permission) &&
            isPrincipalKey(permission.principal) &&
            Object.keys(permission).every((key) => ['principal', 'allow', 'deny'].includes(key)) &&
            ['allow', 'deny'].every(
                (key) =>
                    permission[key] === undefined ||
                    (Array.isArray(permission[key]) &&
                        permission[key].every((action: unknown) =>
                            [
                                'READ',
                                'CREATE',
                                'MODIFY',
                                'DELETE',
                                'PUBLISH',
                                'READ_PERMISSIONS',
                                'WRITE_PERMISSIONS',
                            ].includes(action as string)
                        ))
            )
    );

const isIndexConfigEntry = (value: unknown) =>
    isRecord(value) &&
    Object.keys(value).every((key) => {
        if (['languages', 'indexValueProcessors'].includes(key)) {
            return Array.isArray(value[key]) &&
                value[key].every((item: unknown) => typeof item === 'string');
        }
        return (
            ['decideByType', 'enabled', 'nGram', 'fulltext', 'includeInAllText', 'path'].includes(key) &&
            typeof value[key] === 'boolean'
        );
    });

const isNodeIndexConfig = (value: unknown) =>
    isRecord(value) &&
    Object.keys(value).every((key) => {
        if (key === 'analyzer') {
            return typeof value[key] === 'string';
        }
        if (key === 'default' || key === 'allText') {
            return isIndexConfigEntry(value[key]);
        }
        if (key === 'configs') {
            return Array.isArray(value[key]) &&
                value[key].every(
                    (entry: unknown) =>
                        isRecord(entry) &&
                        typeof entry.path === 'string' &&
                        isIndexConfigEntry(entry.config)
                );
        }
        return false;
    });

const hasValidNodeMetadata = (node: Record<string, unknown>) =>
    (node._permissions === undefined || isNodePermissions(node._permissions)) &&
    (node._indexConfig === undefined || isNodeIndexConfig(node._indexConfig)) &&
    (node._inheritsPermissions === undefined || typeof node._inheritsPermissions === 'boolean') &&
    (node._childOrder === undefined || typeof node._childOrder === 'string') &&
    (node._manualOrderValue === undefined ||
        (typeof node._manualOrderValue === 'number' && isFinite(node._manualOrderValue))) &&
    (node.originProject === undefined ||
        REQUIRED_PROJECTS.some(({ id }) => id === node.originProject)) &&
    (node.variantOf === undefined || isCuratedContentId(node.variantOf)) &&
    (node.inherit === undefined ||
        (Array.isArray(node.inherit) &&
            node.inherit.every((value) => ['CONTENT', 'PARENT', 'NAME', 'SORT'].includes(value))));

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

const isImportSupplement = (value: unknown): value is ImportSupplement => {
    if (
        !isRecord(value) ||
        !isCuratedRepository(value.repoId) ||
        !isCuratedBranch(value.branch) ||
        !isCuratedContentId(value.contentId) ||
        !isCuratedContentPath(value.contentPath) ||
        !Array.isArray(value.invalidValuePaths) ||
        value.invalidValuePaths.length === 0 ||
        value.invalidValuePaths.some((path) => typeof path !== 'string') ||
        !isRecord(value.node)
    ) {
        return false;
    }
    const node = value.node;
    return (
        node._id === value.contentId &&
        node._path === value.contentPath &&
        node._name === value.contentPath.slice(value.contentPath.lastIndexOf('/') + 1) &&
        (node._nodeType === undefined || node._nodeType === 'content') &&
        typeof node.type === 'string' &&
        /^(no\.nav\.navno|portal|base|media):[a-zA-Z0-9-]+$/.test(node.type) &&
        (node.attachment === undefined ||
            (Array.isArray(node.attachment)
                ? node.attachment.every(isRecord)
                : isRecord(node.attachment))) &&
        (node.attachments === undefined || isRecord(node.attachments)) &&
        Object.keys(node).every(
            (key) => SUPPLEMENT_NODE_KEYS.includes(key) || READ_ONLY_NODE_KEYS.includes(key)
        ) &&
        value.invalidValuePaths.every((path) => {
            const segments = parseStringLeafPath(path);
            return segments !== null && getStringLeaf(node, segments) !== null;
        }) &&
        hasValidNodeMetadata(node) &&
        !containsInvalidXmlCharacter(node)
    );
};

const hasDuplicateTargets = (entries: ImportEntry[] | ImportSupplement[]) => {
    const ids = new Set<string>();
    const paths = new Set<string>();
    return entries.some((entry) => {
        const branches = 'branches' in entry ? entry.branches : [entry.branch];
        return branches.some((branch) => {
            const id = `${entry.repoId}:${branch}:${entry.contentId}`;
            const path = `${entry.repoId}:${branch}:${
                'paths' in entry ? entry.paths[branch] : entry.contentPath
            }`;
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
        body.supplements !== undefined &&
        (!Array.isArray(body.supplements) ||
            !body.supplements.every(isImportSupplement) ||
            hasDuplicateTargets(body.supplements))
    ) {
        throw new Error('Invalid import supplements');
    }
    if (
        body.repository &&
        body.branch &&
        (body.entries?.some(
            (entry) =>
                entry.repoId !== body.repository || !entry.branches.includes(body.branch!)
        ) ||
            body.supplements?.some(
                (supplement) =>
                    supplement.repoId !== body.repository || supplement.branch !== body.branch
            ))
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
        !isFinite(result.total) ||
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
        if (!descendant || !descendant._path.startsWith(`${content._path}/`)) {
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

const getParents = (project: Project) =>
    project.parents.length > 0 ? project.parents : project.parent ? [project.parent] : [];

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
        const plans = supplements.map((supplement) => {
            const content = connection.get<Content>(supplement.contentId);
            if (!content) {
                throw new Error(
                    `Native-imported supplement ${repository}:${branch}:${supplement.contentId} is missing; native import must preserve the exact content ID`
                );
            }
            assertContentOwnership(content, supplement.contentId, supplement.contentPath);
            const patches = supplement.invalidValuePaths.map((path) => {
                const segments = parseStringLeafPath(path)!;
                const source = getStringLeaf(supplement.node, segments)!;
                const target = getStringLeaf(content, segments);
                if (!target) {
                    throw new Error(
                        `Native-imported supplement ${supplement.contentId} has no string leaf at ${path}`
                    );
                }
                return { path, segments, value: source.value };
            });
            return { supplement, patches };
        });
        return plans.map(({ supplement, patches }) => {
            const restoredNode = connection.modify<Content>({
                key: supplement.contentId,
                editor: (targetNode) => {
                    assertContentOwnership(targetNode, supplement.contentId, supplement.contentPath);
                    const leaves = patches.map((patch) => {
                        const leaf = getStringLeaf(targetNode, patch.segments);
                        if (!leaf) {
                            throw new Error(
                                `Supplement ${supplement.contentId} cannot replace a missing or typed non-string leaf at ${patch.path}`
                            );
                        }
                        return { ...patch, leaf };
                    });
                    // Retain XP's typed reference, date and binary editor values everywhere else.
                    leaves.forEach(({ leaf, value }) => {
                        leaf.parent[leaf.key] = value;
                    });
                    return targetNode;
                },
            });
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
) => relocateImportPaths(repository, branch, entries, false).relocatedPaths;

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
        validationLevel: 'identity-only',
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

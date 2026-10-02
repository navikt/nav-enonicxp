import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as appLib from '/lib/xp/app';
import * as projectLib from '/lib/xp/project';
import { Project } from '/lib/xp/project';
import { dynamicPageContentTypes, legacyPageContentTypes } from '../contenttype-lists';
import { findTargetContentAndLocale } from '../../services/sitecontent/common/find-target-content-and-locale';
import { getLayersData } from '../localization/layers-data';
import { runInLocaleContext } from '../localization/locale-context';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { getRepoConnection } from '../repos/repo-utils';
import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';
import {
    CURATED_CONTENT_ROOT_PATH,
    CURATED_REPOSITORIES,
    REQUIRED_PROJECTS,
    getProjectParents,
    isCuratedBranch,
    isCuratedContentId,
    isCuratedContentPath,
    isCuratedRepository,
} from './curated-safety';

const MAX_INPUT_PATHS = 1000;
const MAX_EXPORT_ENTRIES = 20000;
// Referenced pages are included, but do not recursively pull in their own links. Other dependency
// types are expanded because they may contain references needed to render the selected page.
const NON_TRANSITIVE_DEPENDENCY_CONTENT_TYPES: ReadonlySet<ContentDescriptor> = new Set([
    ...dynamicPageContentTypes,
    ...legacyPageContentTypes,
]);
const SUPERSEDED_PAGE_CONTENT_TYPES: ReadonlySet<ContentDescriptor> = new Set([
    'no.nav.navno:dynamic-page',
    'no.nav.navno:overview',
    'no.nav.navno:forms-overview',
]);
const TYPE_COVERAGE_CONTENT_TYPES = dynamicPageContentTypes.filter(
    (contentType) => !SUPERSEDED_PAGE_CONTENT_TYPES.has(contentType)
);
const EXCLUDED_ROOT_PATHS = ['/www.nav.no/brukertester', '/www.nav.no/testsider'];
const REQUIRED_RECURSIVE_ROOTS: ReadonlyArray<{
    path: string;
    reason: Extract<CuratedExportReason, 'office-editorial' | 'decorator-menu'>;
}> = [
    { path: '/www.nav.no/arbeidsgiver/editorial-mappe', reason: 'office-editorial' },
    { path: '/www.nav.no/kontor/editorial-mappe', reason: 'office-editorial' },
    { path: '/www.nav.no/dekorator-meny', reason: 'decorator-menu' },
];

export type CuratedExportReason =
    'popular' | 'type-coverage' | 'dependency' | 'ancestor' | 'office-editorial' | 'decorator-menu';

export type CuratedExportEntry = {
    contentId: string;
    paths: Partial<Record<'draft' | 'master', string>>;
    versions: Partial<Record<'draft' | 'master', string>>;
    contentType: string;
    locale: string;
    repoId: string;
    reason: CuratedExportReason;
    descendantCount: number;
    branches: Array<'draft' | 'master'>;
};

export type CuratedExportSeed = {
    repository: string;
    branch: 'draft' | 'master';
    contentId: string;
};

export type CuratedExportProgress = {
    stage: string;
    // Content per branch: checked catches up with queued as the dependency walk finishes.
    checked: number;
    queued: number;
};

export type CuratedExportOptions = {
    seeds?: CuratedExportSeed[];
    includeDrafts?: boolean;
    onProgress?: (progress: CuratedExportProgress) => void;
};

export type CuratedExportManifest = {
    scope: 'full' | 'page';
    includeDrafts: boolean;
    generatedAt: string;
    xpVersion: string;
    applications: Array<{
        key: string;
        version: string | null;
        installed: boolean;
        started: boolean;
        system: boolean;
        required: boolean;
    }>;
    projects: Project[];
    entries: CuratedExportEntry[];
    unresolvedPaths: string[];
    missingContentTypes: string[];
};

type InstalledApplication = {
    key: string;
    version: string | null;
    started: boolean;
    system: boolean;
};

const getEntryKey = ({ contentId, repoId }: CuratedExportEntry) => `${repoId}:${contentId}`;

export const escapeNoqlStringLiteral = (value: string) => value.replace(/[\\"]/g, '\\$&');

const isExcludedPath = (path: string) =>
    EXCLUDED_ROOT_PATHS.some((rootPath) => path === rootPath || path.startsWith(`${rootPath}/`));

const isAllowedNodePath = (path: string) =>
    isCuratedContentPath(path) && !isExcludedPath(path.slice('/content'.length));

type SourceBranch = 'draft' | 'master';

// By default only published content is exported: master is read and mirrored into the local draft
// branch, so unpublished changes stay in the source. With includeDrafts, both branches are read.
const getSourceBranches = (includeDrafts: boolean): SourceBranch[] =>
    includeDrafts ? ['draft', 'master'] : ['master'];

const getEntry = (
    content: Content,
    locale: string,
    reason: CuratedExportReason,
    sourceBranches: SourceBranch[],
    sourceBranch: SourceBranch = 'master'
): CuratedExportEntry | null => {
    const repoId = getLayersData().localeToRepoIdMap[locale];
    if (!repoId) {
        throw new Error(`No content repository found for locale "${locale}"`);
    }
    // Layers outside the curated project set (e.g. a newly added layer) are out of scope.
    if (!isCuratedRepository(repoId)) {
        return null;
    }

    const paths: CuratedExportEntry['paths'] = {};
    const versions: CuratedExportEntry['versions'] = {};
    const branches: CuratedExportEntry['branches'] = [];
    let contentType = content.type;
    sourceBranches.forEach((branch) => {
        const node = getRepoConnection({ repoId, branch, asAdmin: true }).get<Content>(content._id);
        if (!node || !isAllowedNodePath(node._path)) {
            return;
        }
        if (!node._versionKey) {
            throw new Error(`Missing source version for ${repoId}:${branch}:${content._id}`);
        }
        if (branch === sourceBranch && node._path !== `/content${content._path}`) {
            throw new Error(`Content moved while planning: ${repoId}:${branch}:${content._id}`);
        }
        if (branch === sourceBranch) {
            contentType = node.type;
        }
        paths[branch] = node._path;
        versions[branch] = node._versionKey;
        branches.push(branch);
    });
    if (!branches.includes(sourceBranch)) {
        if (isAllowedNodePath(`/content${content._path}`)) {
            throw new Error(
                `Content disappeared while planning: ${repoId}:${sourceBranch}:${content._id}`
            );
        }
        return null;
    }
    const descendantCount = branches.reduce((maximum, branch) => {
        const escapedBranchPath = escapeNoqlStringLiteral(paths[branch]!);
        return Math.max(
            maximum,
            getRepoConnection({ repoId, branch, asAdmin: true }).query({
                count: 0,
                query: `_path LIKE "${escapedBranchPath}/*"`,
            }).total
        );
    }, 0);

    const isMirrored = !sourceBranches.includes('draft');
    return {
        contentId: content._id,
        paths: isMirrored ? { draft: paths.master, master: paths.master } : paths,
        versions: isMirrored ? { draft: versions.master, master: versions.master } : versions,
        contentType,
        locale,
        repoId,
        reason,
        descendantCount,
        branches: isMirrored ? ['draft', 'master'] : branches,
    };
};

// Mirrored draft data is a copy of master, so only branches that were actually read are walked.
const getReadBranches = (entry: CuratedExportEntry, sourceBranches: SourceBranch[]) =>
    entry.branches.filter((branch) => sourceBranches.includes(branch));

const getRequiredProjects = () => {
    const projectsById = projectLib.list().reduce<Record<string, Project>>((projects, project) => {
        projects[project.id] = project;
        return projects;
    }, {});

    return REQUIRED_PROJECTS.map((expectedProject) => {
        const project = projectsById[expectedProject.id];
        if (!project) {
            throw new Error(`Required content project "${expectedProject.id}" was not found`);
        }

        const parents = getProjectParents(project);
        if (
            project.language !== expectedProject.language ||
            parents.length !== expectedProject.parents.length ||
            parents.some((parent, index) => parent !== expectedProject.parents[index])
        ) {
            throw new Error(
                `Content project "${project.id}" has unexpected language or parent metadata`
            );
        }

        return project;
    });
};

const getRequiredApplications = (entries: CuratedExportEntry[]) => {
    const contentTypeApplicationKeys = new Set(
        entries
            .map(({ contentType }) => contentType.split(':', 1)[0])
            .filter((applicationKey) => !['base', 'media', 'portal'].includes(applicationKey))
    );
    const applications = appLib.list() as InstalledApplication[];
    const missingApplicationKeys: string[] = [];
    contentTypeApplicationKeys.forEach((applicationKey) => {
        if (!applications.some(({ key }) => key === applicationKey)) {
            missingApplicationKeys.push(applicationKey);
        }
    });
    if (missingApplicationKeys.length > 0) {
        throw new Error(
            `Applications owning selected content types are not installed: ${missingApplicationKeys.join(', ')}`
        );
    }

    return applications
        .filter(({ system }) => !system)
        .map((application) => ({
            key: application.key,
            version: application.version,
            installed: true,
            started: Boolean(application.started),
            system: false,
            // Content Studio and apps owning imported content types must install; other apps only warn.
            required:
                application.key === 'com.enonic.app.contentstudio' ||
                application.key === app.name ||
                contentTypeApplicationKeys.has(application.key),
        }));
};

const getXpVersion = () => {
    const versions = (appLib.list() as InstalledApplication[])
        .filter(({ system }) => system)
        .map(({ version }) => version)
        .filter(
            (version, index, allVersions): version is string =>
                Boolean(version) && allVersions.indexOf(version) === index
        );
    if (versions.length !== 1) {
        throw new Error(`Could not determine one XP runtime version: ${versions.join(', ')}`);
    }
    return versions[0];
};

const validateRepositorySet = (entries: CuratedExportEntry[]) => {
    const selectedRepoIds = entries
        .map(({ repoId }) => repoId)
        .filter((repoId, index, repoIds) => repoIds.indexOf(repoId) === index)
        .sort((repoIdA, repoIdB) => repoIdA.localeCompare(repoIdB));
    const requiredRepoIds = CURATED_REPOSITORIES.slice().sort((repoIdA, repoIdB) =>
        repoIdA.localeCompare(repoIdB)
    );
    if (
        selectedRepoIds.length !== requiredRepoIds.length ||
        selectedRepoIds.some((repoId, index) => repoId !== requiredRepoIds[index])
    ) {
        throw new Error(
            `Manifest repository set must be exactly ${requiredRepoIds.join(', ')}, got ${selectedRepoIds.join(', ')}`
        );
    }
};

const assertSelectedSourceConsistency = (
    entries: CuratedExportEntry[],
    sourceBranches: SourceBranch[]
) => {
    entries.forEach((entry) => {
        getReadBranches(entry, sourceBranches).forEach((branch) => {
            const node = getRepoConnection({
                repoId: entry.repoId,
                branch,
                asAdmin: true,
            }).get<Content>(entry.contentId);
            if (
                !node ||
                node._versionKey !== entry.versions[branch] ||
                node._path !== entry.paths[branch]
            ) {
                throw new Error(
                    `Content changed while planning: ${entry.repoId}:${branch}:${entry.contentId}`
                );
            }
        });
    });
};

const findTypeRepresentative = (
    contentType: ContentDescriptor,
    sourceBranches: SourceBranch[]
): CuratedExportEntry | null => {
    const contentByRepoId = queryAllLayersToRepoIdBuckets({
        branch: 'master',
        state: 'localized',
        resolveContent: true,
        queryParams: {
            // The query spans every layer, so leave room for hits in non-curated layers.
            count: 50,
            query: `_path LIKE "/content/www.nav.no/*"${EXCLUDED_ROOT_PATHS.map(
                (path) => ` AND NOT _path LIKE "/content${path}*"`
            ).join('')}`,
            filters: {
                boolean: {
                    must: {
                        hasValue: {
                            field: 'type',
                            values: [contentType],
                        },
                    },
                },
            },
            sort: 'modifiedTime DESC',
        },
    });
    const { repoIdToLocaleMap } = getLayersData();

    for (const repoId of CURATED_REPOSITORIES) {
        const content = contentByRepoId[repoId]?.[0];
        const locale = repoIdToLocaleMap[repoId];
        if (content && locale) {
            return getEntry(content, locale, 'type-coverage', sourceBranches);
        }
    }

    return null;
};

const closeContentGraph = (
    initialEntries: CuratedExportEntry[],
    entriesByKey: Record<string, CuratedExportEntry>,
    sourceBranches: SourceBranch[],
    onProgress: (progress: CuratedExportProgress) => void
) => {
    const pendingEntries: Array<{ entry: CuratedExportEntry; branch: SourceBranch }> = [];
    const queuedBranches = new Set<string>();
    const expandableEntryKeys = new Set<string>();
    const selectedEntriesByPath = new Map<string, CuratedExportEntry>();
    let entryCount = Object.keys(entriesByKey).length;
    const canExpandDependency = (entry: CuratedExportEntry) =>
        !NON_TRANSITIVE_DEPENDENCY_CONTENT_TYPES.has(entry.contentType as ContentDescriptor);
    const enqueue = (entry: CuratedExportEntry, expandDependencies = false) => {
        const entryKey = getEntryKey(entry);
        if (expandDependencies) {
            expandableEntryKeys.add(entryKey);
        }
        const shouldExpandDependencies = expandableEntryKeys.has(entryKey);
        getReadBranches(entry, sourceBranches).forEach((branch) => {
            const key = `${entryKey}:${branch}:${shouldExpandDependencies ? 'expand' : 'include'}`;
            selectedEntriesByPath.set(`${entry.repoId}:${branch}:${entry.paths[branch]}`, entry);
            if (!queuedBranches.has(key)) {
                queuedBranches.add(key);
                pendingEntries.push({ entry, branch });
            }
        });
    };
    const select = (entry: CuratedExportEntry, expandDependencies = false) => {
        const key = getEntryKey(entry);
        if (!entriesByKey[key]) {
            entryCount += 1;
            if (entryCount > MAX_EXPORT_ENTRIES) {
                throw new Error(`Export exceeded the limit of ${MAX_EXPORT_ENTRIES} content nodes`);
            }
            entriesByKey[key] = entry;
        }
        enqueue(entriesByKey[key], expandDependencies);
    };
    if (entryCount > MAX_EXPORT_ENTRIES) {
        throw new Error(`Export exceeded the limit of ${MAX_EXPORT_ENTRIES} content nodes`);
    }
    initialEntries.forEach((entry) => enqueue(entry, true));

    let checked = 0;
    for (const { entry, branch } of pendingEntries) {
        onProgress({ stage: 'following dependencies', checked, queued: pendingEntries.length });
        checked += 1;
        getAncestorContentPaths(entry.paths[branch]!).forEach((contentPath) => {
            const selectedAncestor = selectedEntriesByPath.get(
                `${entry.repoId}:${branch}:${contentPath}`
            );
            if (selectedAncestor) {
                enqueue(selectedAncestor, true);
                return;
            }
            const ancestor = runInLocaleContext(
                { locale: entry.locale, branch, asAdmin: true },
                () => contentLib.get({ key: contentPath.slice('/content'.length) })
            );
            const ancestorEntry =
                ancestor && getEntry(ancestor, entry.locale, 'ancestor', sourceBranches, branch);
            if (!ancestorEntry) {
                throw new Error(`Missing ancestor ${contentPath} in ${entry.repoId}:${branch}`);
            }
            select(ancestorEntry, true);
        });

        if (!expandableEntryKeys.has(getEntryKey(entry))) {
            continue;
        }

        const dependencies = runInLocaleContext(
            { locale: entry.locale, branch, asAdmin: true },
            () => contentLib.getOutboundDependencies({ key: entry.contentId })
        );

        dependencies.forEach((dependencyId) => {
            const dependencyKey = `${entry.repoId}:${dependencyId}`;
            const selectedDependency = entriesByKey[dependencyKey];
            if (selectedDependency) {
                enqueue(selectedDependency, canExpandDependency(selectedDependency));
                return;
            }
            const dependency = runInLocaleContext(
                { locale: entry.locale, branch, asAdmin: true },
                () => contentLib.get({ key: dependencyId })
            );
            if (!dependency) {
                return;
            }
            if (isExcludedPath(dependency._path)) {
                return;
            }

            const dependencyEntry = getEntry(
                dependency,
                entry.locale,
                'dependency',
                sourceBranches,
                branch
            );
            if (!dependencyEntry) {
                return;
            }
            select(dependencyEntry, canExpandDependency(dependencyEntry));
        });
    }
};

export const getAncestorContentPaths = (contentPath: string) => {
    const ancestorPaths: string[] = [];
    let parentPath = contentPath.slice(0, contentPath.lastIndexOf('/'));

    while (parentPath.length >= CURATED_CONTENT_ROOT_PATH.length) {
        ancestorPaths.unshift(parentPath);
        if (parentPath === CURATED_CONTENT_ROOT_PATH) {
            break;
        }
        parentPath = parentPath.slice(0, parentPath.lastIndexOf('/'));
    }

    return ancestorPaths;
};

const addRecursiveDescendants = (
    rootEntry: CuratedExportEntry,
    entriesByKey: Record<string, CuratedExportEntry>,
    sourceBranches: SourceBranch[]
) => {
    getReadBranches(rootEntry, sourceBranches).forEach((branch) => {
        const rootPath = rootEntry.paths[branch];
        if (!rootPath) {
            return;
        }
        const escapedRootPath = escapeNoqlStringLiteral(rootPath);
        const descendants = runInLocaleContext(
            { locale: rootEntry.locale, branch, asAdmin: true },
            () =>
                contentLib.query({
                    count: MAX_EXPORT_ENTRIES,
                    query: `_path LIKE "${escapedRootPath}/*"`,
                })
        );
        if (descendants.total > descendants.hits.length) {
            throw new Error(
                `Recursive root "${rootPath}" exceeds the ${MAX_EXPORT_ENTRIES} entry limit`
            );
        }
        descendants.hits.forEach((content) => {
            const descendantEntry = getEntry(
                content,
                rootEntry.locale,
                rootEntry.reason,
                sourceBranches,
                branch
            );
            if (descendantEntry) {
                entriesByKey[getEntryKey(descendantEntry)] = descendantEntry;
            }
        });
    });
};

export const createCuratedExportManifest = (
    paths: string[],
    scope: 'full' | 'page' = 'full',
    { seeds = [], includeDrafts = false, onProgress = () => {} }: CuratedExportOptions = {}
): CuratedExportManifest => {
    const sourceBranches = getSourceBranches(includeDrafts);
    if (paths.length + seeds.length > MAX_INPUT_PATHS) {
        throw new Error(`A maximum of ${MAX_INPUT_PATHS} popular paths is allowed`);
    }

    const projects = getRequiredProjects();
    const entriesByKey: Record<string, CuratedExportEntry> = {};
    const unresolvedPaths: string[] = [];
    const reportStage = (stage: string) =>
        onProgress({ stage, checked: 0, queued: Object.keys(entriesByKey).length });

    reportStage('resolving pages');
    seeds.forEach((seed) => {
        const locale = getLayersData().repoIdToLocaleMap[seed.repository];
        if (
            !isCuratedRepository(seed.repository) ||
            !locale ||
            !isCuratedBranch(seed.branch) ||
            !isCuratedContentId(seed.contentId)
        ) {
            throw new Error('Invalid structured content seed');
        }
        // Without drafts, draft seeds (e.g. Content Studio URLs) resolve to their published version.
        const seedBranch = sourceBranches.includes(seed.branch) ? seed.branch : 'master';
        const content = runInLocaleContext({ locale, branch: seedBranch, asAdmin: true }, () =>
            contentLib.get({ key: seed.contentId })
        );
        const entry = content && getEntry(content, locale, 'popular', sourceBranches, seedBranch);
        if (!entry) {
            throw new Error(
                `Structured content seed is ${includeDrafts ? 'missing' : 'unpublished, missing'} or excluded: ${seed.repository}:${seedBranch}:${seed.contentId}`
            );
        }
        entriesByKey[getEntryKey(entry)] = entry;
    });

    paths.forEach((path) => {
        if (isExcludedPath(path)) {
            return;
        }

        const target = findTargetContentAndLocale({ path, branch: 'master' });
        if (!target) {
            unresolvedPaths.push(path);
            return;
        }

        const entry = getEntry(target.content, target.locale, 'popular', sourceBranches);
        if (entry) {
            entriesByKey[getEntryKey(entry)] = entry;
        }
    });

    if (scope === 'full') {
        reportStage('adding required sections');
        REQUIRED_RECURSIVE_ROOTS.forEach(({ path, reason }) => {
            const target = findTargetContentAndLocale({ path, branch: 'master' });
            if (!target) {
                unresolvedPaths.push(path);
                return;
            }

            const entry = getEntry(target.content, target.locale, reason, sourceBranches);
            if (entry) {
                entriesByKey[getEntryKey(entry)] = entry;
                addRecursiveDescendants(entry, entriesByKey, sourceBranches);
            }
        });
    }

    const selectedEntries = Object.values(entriesByKey);
    const selectedTypes = new Set(selectedEntries.map((entry) => entry.contentType));
    const missingContentTypes: string[] = [];

    if (scope === 'full') {
        reportStage('adding content type examples');
        TYPE_COVERAGE_CONTENT_TYPES.forEach((contentType) => {
            if (selectedTypes.has(contentType)) {
                return;
            }

            const representative = findTypeRepresentative(contentType, sourceBranches);
            if (!representative) {
                missingContentTypes.push(contentType);
                return;
            }

            entriesByKey[getEntryKey(representative)] = representative;
            selectedTypes.add(representative.contentType);
        });
    }

    closeContentGraph(Object.values(entriesByKey), entriesByKey, sourceBranches, onProgress);
    const entries = Object.values(entriesByKey);
    reportStage('validating');
    if (scope === 'full') {
        validateRepositorySet(entries);
    }
    const applications = getRequiredApplications(entries);
    assertSelectedSourceConsistency(entries, sourceBranches);

    return {
        scope,
        includeDrafts,
        generatedAt: new Date().toISOString(),
        xpVersion: getXpVersion(),
        applications,
        projects,
        entries,
        unresolvedPaths,
        missingContentTypes,
    };
};

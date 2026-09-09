import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import * as appLib from '/lib/xp/app';
import * as projectLib from '/lib/xp/project';
import { Project } from '/lib/xp/project';
import { dynamicPageContentTypes } from '../contenttype-lists';
import { findTargetContentAndLocale } from '../../services/sitecontent/common/find-target-content-and-locale';
import { getLayersData } from '../localization/layers-data';
import { runInLocaleContext } from '../localization/locale-context';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { getRepoConnection } from '../repos/repo-utils';
import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';

const MAX_INPUT_PATHS = 1000;
const MAX_EXPORT_ENTRIES = 20000;
const CONTENT_ROOT_PATH = '/content/www.nav.no';
const REQUIRED_PROJECTS = [
    { id: 'default', language: 'no', parents: [] },
    { id: 'navno-engelsk', language: 'en', parents: ['default'] },
    { id: 'navno-nynorsk', language: 'nn', parents: ['default'] },
] as const;
const REQUIRED_REPO_IDS = REQUIRED_PROJECTS.map(({ id }) => `com.enonic.cms.${id}`);
const MAX_CONTAINER_DEPENDENCY_DESCENDANTS = 50;
const BROAD_CONTAINER_DEPENDENCY_TYPES: ReadonlySet<ContentDescriptor> = new Set([
    'no.nav.navno:section-page',
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
    | 'popular'
    | 'type-coverage'
    | 'dependency'
    | 'ancestor'
    | 'office-editorial'
    | 'decorator-menu';

export type CuratedExportEntry = {
    contentId: string;
    paths: Partial<Record<'draft' | 'master', string>>;
    contentType: string;
    locale: string;
    repoId: string;
    reason: CuratedExportReason;
    descendantCount: number;
    branches: Array<'draft' | 'master'>;
};

export type CuratedExportManifest = {
    scope: 'full' | 'page';
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
    excludedDependencies: CuratedExportEntry[];
    unresolvedPaths: string[];
    missingContentTypes: string[];
    sanitizedSupplements: CuratedExportSupplement[];
};

type InstalledApplication = {
    key: string;
    version: string | null;
    started: boolean;
    system: boolean;
};

export type CuratedExportSupplement = {
    contentId: string;
    contentPath: string;
    repoId: string;
    branch: 'draft' | 'master';
    invalidValuePaths: string[];
    node: RepoNode<Content>;
};

const isValidXmlCharacter = (character: string) => {
    const characterCode = character.charCodeAt(0);
    return (
        characterCode === 0x09 ||
        characterCode === 0x0a ||
        characterCode === 0x0d ||
        (characterCode >= 0x20 && characterCode <= 0xd7ff) ||
        (characterCode >= 0xe000 && characterCode <= 0xfffd)
    );
};

const sanitizeXmlValue = (
    value: unknown,
    valuePath: string,
    invalidValuePaths: string[]
): unknown => {
    if (typeof value === 'string') {
        const sanitizedValue = value.split('').filter(isValidXmlCharacter).join('');
        if (sanitizedValue !== value) {
            invalidValuePaths.push(valuePath);
        }
        return sanitizedValue;
    }
    if (Array.isArray(value)) {
        return value.map((item, index) =>
            sanitizeXmlValue(item, `${valuePath}[${index}]`, invalidValuePaths)
        );
    }
    if (value && Object.prototype.toString.call(value) === '[object Object]') {
        return Object.keys(value).reduce<Record<string, unknown>>((sanitized, key) => {
            if (!valuePath && key === 'attachment') {
                sanitized[key] = (value as Record<string, unknown>)[key];
                return sanitized;
            }
            sanitized[key] = sanitizeXmlValue(
                (value as Record<string, unknown>)[key],
                valuePath ? `${valuePath}.${key}` : key,
                invalidValuePaths
            );
            return sanitized;
        }, {});
    }
    return value;
};

export const createSanitizedSupplement = (
    node: RepoNode<Content>,
    repoId: string,
    branch: 'draft' | 'master'
): CuratedExportSupplement | null => {
    const invalidValuePaths: string[] = [];
    const sanitizedNode = sanitizeXmlValue(node, '', invalidValuePaths) as RepoNode<Content>;
    if (invalidValuePaths.length === 0) {
        return null;
    }
    if (node.attachment || Object.keys(node.attachments || {}).length > 0) {
        throw new Error(
            `Cannot supplement ${repoId}:${branch}:${node._path} because it has attachments`
        );
    }

    return {
        contentId: node._id,
        contentPath: node._path,
        repoId,
        branch,
        invalidValuePaths,
        node: sanitizedNode,
    };
};

const getEntryKey = ({ contentId, repoId }: CuratedExportEntry) => `${repoId}:${contentId}`;

const isExcludedPath = (path: string) =>
    EXCLUDED_ROOT_PATHS.some((rootPath) => path === rootPath || path.startsWith(`${rootPath}/`));

const getEntry = (
    content: Content,
    locale: string,
    reason: CuratedExportReason,
    sourceBranch: 'draft' | 'master' = 'master'
): CuratedExportEntry => {
    const repoId = getLayersData().localeToRepoIdMap[locale];
    if (!repoId) {
        throw new Error(`No content repository found for locale "${locale}"`);
    }

    const contentPath = `/content${content._path}`;
    const draftNode = getRepoConnection({ repoId, branch: 'draft', asAdmin: true }).get(content._id);
    const masterNode = getRepoConnection({ repoId, branch: 'master', asAdmin: true }).get(content._id);
    const paths: CuratedExportEntry['paths'] = {
        draft: draftNode?._path,
        master: masterNode?._path,
        [sourceBranch]: contentPath,
    };
    const branches = (['draft', 'master'] as const).filter((branch) => paths[branch]);
    const descendantCount = branches.reduce(
        (maximum, branch) => {
            const escapedBranchPath = paths[branch]!.replace(/"/g, '\\"');
            return Math.max(
                maximum,
                getRepoConnection({ repoId, branch, asAdmin: true }).query({
                    count: 0,
                    query: `_path LIKE "${escapedBranchPath}/*"`,
                }).total
            );
        },
        0
    );

    return {
        contentId: content._id,
        paths,
        contentType: content.type,
        locale,
        repoId,
        reason,
        descendantCount,
        branches,
    };
};

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

        const parents = project.parents.length > 0
            ? project.parents
            : project.parent
              ? [project.parent]
              : [];
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
        .filter((version, index, allVersions): version is string =>
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
        .sort();
    const requiredRepoIds = REQUIRED_REPO_IDS.slice().sort();
    if (
        selectedRepoIds.length !== requiredRepoIds.length ||
        selectedRepoIds.some((repoId, index) => repoId !== requiredRepoIds[index])
    ) {
        throw new Error(
            `Manifest repository set must be exactly ${requiredRepoIds.join(', ')}, got ${selectedRepoIds.join(', ')}`
        );
    }
};

const getSanitizedSupplements = (entries: CuratedExportEntry[]) => {
    const supplements: CuratedExportSupplement[] = [];
    entries.forEach((entry) => {
        entry.branches.forEach((branch) => {
            const node = getRepoConnection({ repoId: entry.repoId, branch, asAdmin: true }).get<Content>(
                entry.contentId
            );
            if (!node) {
                return;
            }
            const supplement = createSanitizedSupplement(node, entry.repoId, branch);
            if (supplement) {
                supplements.push(supplement);
            }
        });
    });
    return supplements;
};

const findTypeRepresentative = (contentType: ContentDescriptor): CuratedExportEntry | null => {
    const contentByRepoId = queryAllLayersToRepoIdBuckets({
        branch: 'master',
        state: 'localized',
        resolveContent: true,
        queryParams: {
            count: 1,
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

    for (const [repoId, contents] of Object.entries(contentByRepoId)) {
        const content = contents[0];
        const locale = repoIdToLocaleMap[repoId];
        if (content && locale) {
            return getEntry(content, locale, 'type-coverage');
        }
    }

    return null;
};

const addDependencies = (
    initialEntries: CuratedExportEntry[],
    entriesByKey: Record<string, CuratedExportEntry>,
    excludedDependenciesByKey: Record<string, CuratedExportEntry>
) => {
    const pendingEntries = initialEntries.reduce<
        Array<{ entry: CuratedExportEntry; branch: 'draft' | 'master' }>
    >((pending, entry) => {
        entry.branches.forEach((branch) => pending.push({ entry, branch }));
        return pending;
    }, []);
    const visitedEntryBranches = new Set<string>();

    while (pendingEntries.length > 0) {
        const { entry, branch } = pendingEntries.shift()!;
        const entryBranchKey = `${getEntryKey(entry)}:${branch}`;
        if (visitedEntryBranches.has(entryBranchKey)) {
            continue;
        }
        visitedEntryBranches.add(entryBranchKey);

        if (Object.keys(entriesByKey).length >= MAX_EXPORT_ENTRIES) {
            throw new Error(
                `Export exceeded the limit of ${MAX_EXPORT_ENTRIES} content nodes while processing ${entry.repoId}:${branch}:${entry.paths[branch]}`
            );
        }

        const dependencies = runInLocaleContext(
            { locale: entry.locale, branch, asAdmin: true },
            () => contentLib.getOutboundDependencies({ key: entry.contentId })
        );

        dependencies.forEach((dependencyId) => {
            const dependencyKey = `${entry.repoId}:${dependencyId}`;
            const selectedDependency = entriesByKey[dependencyKey];
            if (selectedDependency) {
                if (selectedDependency.branches.includes(branch)) {
                    pendingEntries.push({ entry: selectedDependency, branch });
                }
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

            const dependencyEntry = getEntry(dependency, entry.locale, 'dependency', branch);
            if (
                BROAD_CONTAINER_DEPENDENCY_TYPES.has(
                    dependencyEntry.contentType as ContentDescriptor
                ) &&
                dependencyEntry.descendantCount > MAX_CONTAINER_DEPENDENCY_DESCENDANTS
            ) {
                excludedDependenciesByKey[dependencyKey] = dependencyEntry;
                return;
            }

            entriesByKey[dependencyKey] = dependencyEntry;
            pendingEntries.push({ entry: dependencyEntry, branch });
        });
    }
};

export const getAncestorContentPaths = (contentPath: string) => {
    const ancestorPaths: string[] = [];
    let parentPath = contentPath.slice(0, contentPath.lastIndexOf('/'));

    while (parentPath.length >= CONTENT_ROOT_PATH.length) {
        ancestorPaths.unshift(parentPath);
        if (parentPath === CONTENT_ROOT_PATH) {
            break;
        }
        parentPath = parentPath.slice(0, parentPath.lastIndexOf('/'));
    }

    return ancestorPaths;
};

const addAncestors = (entriesByKey: Record<string, CuratedExportEntry>) => {
    const selectedPaths = new Set(
        Object.values(entriesByKey).reduce<string[]>((paths, entry) => {
            entry.branches.forEach((branch) =>
                paths.push(`${entry.repoId}:${branch}:${entry.paths[branch]}`)
            );
            return paths;
        }, [])
    );
    Object.values(entriesByKey).forEach((entry) => {
        entry.branches.forEach((branch) => {
            const branchPath = entry.paths[branch]!;
            getAncestorContentPaths(branchPath).forEach((contentPath) => {
                const pathKey = `${entry.repoId}:${branch}:${contentPath}`;
                if (selectedPaths.has(pathKey)) {
                    return;
                }
                const ancestor = runInLocaleContext(
                    { locale: entry.locale, branch, asAdmin: true },
                    () => contentLib.get({ key: contentPath.slice('/content'.length) })
                );
                if (!ancestor) {
                    throw new Error(
                        `Missing ancestor "${contentPath}" for "${branchPath}" in locale "${entry.locale}" branch "${branch}"`
                    );
                }

                const ancestorEntry = getEntry(ancestor, entry.locale, 'ancestor', branch);
                const ancestorKey = getEntryKey(ancestorEntry);
                if (!entriesByKey[ancestorKey]) {
                    entriesByKey[ancestorKey] = ancestorEntry;
                }
                ancestorEntry.branches.forEach((ancestorBranch) =>
                    selectedPaths.add(
                        `${ancestorEntry.repoId}:${ancestorBranch}:${ancestorEntry.paths[ancestorBranch]}`
                    )
                );
            });
        });
    });
};

const getRecursivelyCoveredContentTypes = (entries: CuratedExportEntry[]) => {
    const coveredContentTypes = new Set<string>();

    entries.forEach((entry) => {
        const masterPath = entry.paths.master;
        if (entry.descendantCount === 0 || !masterPath) {
            return;
        }

        const descendantsByRepoId = queryAllLayersToRepoIdBuckets({
            branch: 'master',
            state: 'localized',
            resolveContent: true,
            queryParams: {
                count: MAX_EXPORT_ENTRIES,
                query: `_path LIKE "${masterPath}/*"`,
            },
        });
        Object.values(descendantsByRepoId).forEach((contents) =>
            contents.forEach((content) => coveredContentTypes.add(content.type))
        );
    });

    return coveredContentTypes;
};

const addRecursiveDescendants = (
    rootEntry: CuratedExportEntry,
    entriesByKey: Record<string, CuratedExportEntry>
) => {
    rootEntry.branches.forEach((branch) => {
        const rootPath = rootEntry.paths[branch];
        if (!rootPath) {
            return;
        }
        const descendants = runInLocaleContext(
            { locale: rootEntry.locale, branch, asAdmin: true },
            () =>
                contentLib.query({
                count: MAX_EXPORT_ENTRIES,
                query: `_path LIKE "${rootPath}/*"`,
                })
        );
        if (descendants.total > descendants.hits.length) {
            throw new Error(
                `Recursive root "${rootPath}" exceeds the ${MAX_EXPORT_ENTRIES} entry limit`
            );
        }
        descendants.hits.forEach((content) => {
            const descendantEntry = getEntry(content, rootEntry.locale, rootEntry.reason, branch);
            entriesByKey[getEntryKey(descendantEntry)] = descendantEntry;
        });
    });
};

export const createCuratedExportManifest = (
    paths: string[],
    scope: 'full' | 'page' = 'full'
): CuratedExportManifest => {
    if (paths.length > MAX_INPUT_PATHS) {
        throw new Error(`A maximum of ${MAX_INPUT_PATHS} popular paths is allowed`);
    }

    const projects = getRequiredProjects();
    const entriesByKey: Record<string, CuratedExportEntry> = {};
    const excludedDependenciesByKey: Record<string, CuratedExportEntry> = {};
    const unresolvedPaths: string[] = [];

    paths.forEach((path) => {
        if (isExcludedPath(path)) {
            return;
        }

        const target = findTargetContentAndLocale({ path, branch: 'master' });
        if (!target) {
            unresolvedPaths.push(path);
            return;
        }

        const entry = getEntry(target.content, target.locale, 'popular');
        entriesByKey[getEntryKey(entry)] = entry;
    });

    if (scope === 'full') {
        REQUIRED_RECURSIVE_ROOTS.forEach(({ path, reason }) => {
            const target = findTargetContentAndLocale({ path, branch: 'master' });
            if (!target) {
                unresolvedPaths.push(path);
                return;
            }

            const entry = getEntry(target.content, target.locale, reason);
            entriesByKey[getEntryKey(entry)] = entry;
            addRecursiveDescendants(entry, entriesByKey);
        });
    }

    const selectedEntries = Object.values(entriesByKey);
    const selectedTypes = new Set(selectedEntries.map((entry) => entry.contentType));
    getRecursivelyCoveredContentTypes(selectedEntries).forEach((contentType) =>
        selectedTypes.add(contentType)
    );
    const missingContentTypes: string[] = [];

    if (scope === 'full') {
        TYPE_COVERAGE_CONTENT_TYPES.forEach((contentType) => {
            if (selectedTypes.has(contentType)) {
                return;
            }

            const representative = findTypeRepresentative(contentType);
            if (!representative) {
                missingContentTypes.push(contentType);
                return;
            }

            entriesByKey[getEntryKey(representative)] = representative;
        });
    }

    addDependencies(
        Object.values(entriesByKey),
        entriesByKey,
        excludedDependenciesByKey
    );
    addAncestors(entriesByKey);
    const entries = Object.values(entriesByKey);
    if (scope === 'full') {
        validateRepositorySet(entries);
    }
    const applications = getRequiredApplications(entries);
    const sanitizedSupplements = getSanitizedSupplements(entries);

    return {
        scope,
        generatedAt: new Date().toISOString(),
        xpVersion: getXpVersion(),
        applications,
        projects,
        entries,
        excludedDependencies: Object.values(excludedDependenciesByKey),
        unresolvedPaths,
        missingContentTypes,
        sanitizedSupplements,
    };
};
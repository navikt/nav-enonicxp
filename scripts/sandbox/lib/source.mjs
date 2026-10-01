import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
    CONTENT_ROOT_PATH,
    CURATED_BRANCHES,
    CURATED_REPOSITORIES,
    fetchXp,
    getXpSessionCookie,
    isCuratedContentPath,
    isCuratedId,
    isSafeName,
    LOOPBACK_HOSTS,
    PROJECT_REPOSITORIES,
    readRunningSandbox,
    readSandboxXpVersion,
    REQUIRED_PROJECTS,
} from './common.mjs';

const DEPLOYED_SOURCES = {
    prod: 'https://portal-admin.oera.no',
    dev1: 'https://portal-admin-dev.oera.no',
    dev2: 'https://portal-admin-q6.oera.no',
};

const SERVICE_PATH = '/_/service/no.nav.navno/curatedExportManifest';
const SOURCE_SERVICE_PATH = '/_/service/no.nav.navno/curatedExportSource';
const DEPLOYED_SOURCE_BY_HOST = {
    'www.nav.no': 'prod',
    'nav.no': 'prod',
    'portal-admin.oera.no': 'prod',
    'portal-admin-dev.oera.no': 'dev1',
    'portal-admin-q6.oera.no': 'dev2',
};

const createDeployedSource = (name, origin) => ({
    kind: 'deployed',
    name,
    origin,
    serviceUrl: `${origin}${SERVICE_PATH}`,
    sourceServiceUrl: `${origin}${SOURCE_SERVICE_PATH}`,
});

export const resolveCuratedSource = (
    source,
    { homeDirectory = homedir(), runningSandbox = readRunningSandbox(homeDirectory) } = {}
) => {
    const deployedOrigin = DEPLOYED_SOURCES[source];
    if (deployedOrigin) {
        return createDeployedSource(source, deployedOrigin);
    }

    if (/^https?:\/\//.test(source)) {
        const url = new URL(source);
        if (url.username || url.password) {
            throw new Error('--source URLs must not contain credentials');
        }
        if ((url.pathname && url.pathname !== '/') || url.search || url.hash) {
            throw new Error('--source URL must contain only the XP origin');
        }
        return createDeployedSource(source, url.origin);
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(source)) {
        throw new Error(`Unsupported source sandbox name: ${source}`);
    }

    const sandboxPath = join(homeDirectory, '.enonic', 'sandboxes', source);
    if (!existsSync(join(sandboxPath, '.enonic'))) {
        throw new Error(`Source is neither a known environment nor a local sandbox: ${source}`);
    }
    if (runningSandbox !== source) {
        throw new Error(
            `Start source sandbox ${source}; currently running: ${runningSandbox ?? 'none'}`
        );
    }

    return {
        kind: 'local',
        name: source,
        origin: 'http://localhost:8080',
        serviceUrl: `http://localhost:8080${SERVICE_PATH}`,
        sourceServiceUrl: `http://localhost:8080${SOURCE_SERVICE_PATH}`,
        sandboxPath,
        ...readSandboxXpVersion(sandboxPath),
    };
};

export const inferCuratedSourceFromPage = (value) => {
    const url = new URL(value);
    const deployedSource = DEPLOYED_SOURCE_BY_HOST[url.hostname];
    if (deployedSource) {
        return deployedSource;
    }
    if (parseContentStudioPageUrl(value) && !LOOPBACK_HOSTS.has(url.hostname)) {
        return url.origin;
    }
    throw new Error(`Could not infer source from ${url.origin}; pass --source explicitly`);
};

export const parseContentStudioPageUrl = (value) => {
    const url = new URL(value);
    const match = url.pathname.match(
        /^\/admin\/tool\/com\.enonic\.app\.contentstudio\/main\/([^/]+)\/edit\/([a-zA-Z0-9-]+)\/?$/
    );
    if (!match) {
        return null;
    }

    const project = decodeURIComponent(match[1]);
    const repository = PROJECT_REPOSITORIES[project];
    if (!repository) {
        throw new Error(`Unsupported Content Studio project: ${project}`);
    }
    return { repository, branch: 'draft', contentId: match[2] };
};

export const resolveCuratedPage = ({ page }) => {
    const contentStudioPage = parseContentStudioPageUrl(page);
    if (contentStudioPage) {
        return contentStudioPage;
    }
    if (!['http:', 'https:'].includes(new URL(page).protocol)) {
        throw new Error('Page URLs must use HTTP or HTTPS');
    }
    return page;
};

const MANIFEST_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

const normalizePath = (value) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('#')) {
        return null;
    }

    const path = /^https?:\/\//.test(trimmed)
        ? new URL(trimmed).pathname
        : trimmed.split(/[?#]/, 1)[0];

    if (path.startsWith('/content/www.nav.no')) {
        return path.slice('/content'.length);
    }
    if (path.startsWith('/www.nav.no')) {
        return path;
    }

    return `/www.nav.no${path.startsWith('/') ? path : `/${path}`}`;
};

const normalizePaths = (values) => {
    if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
        throw new Error('Input must contain a JSON array or one URL/path per line');
    }

    return [...new Set(values.map(normalizePath).filter(Boolean))];
};

const readPaths = (inputPath) => {
    const contents = readFileSync(inputPath, 'utf8');
    return normalizePaths(
        inputPath.endsWith('.json') ? JSON.parse(contents) : contents.split(/\r?\n/)
    );
};

const createExportName = (bundle, entry, index) => {
    const locale = entry.locale.replace(/[^a-zA-Z0-9-]/g, '-');
    return `${bundle}-${String(index + 1).padStart(2, '0')}-${locale}-${entry.sourceBranch}`;
};

const createNativeExports = (bundle, entries) => {
    const exportEntries = entries.flatMap((entry) =>
        entry.branches.map((sourceBranch) => ({
            ...entry,
            sourceBranch,
            sourcePath: entry.paths[sourceBranch],
        }))
    );
    const groups = exportEntries.reduce((byRepositoryAndBranch, entry) => {
        const key = `${entry.repoId}:${entry.sourceBranch}`;
        byRepositoryAndBranch[key] ||= {
            repoId: entry.repoId,
            locale: entry.locale,
            sourceBranch: entry.sourceBranch,
            entries: [],
        };
        byRepositoryAndBranch[key].entries.push(entry);
        return byRepositoryAndBranch;
    }, {});

    return Object.values(groups).map((group, index) => {
        const contentPath = CONTENT_ROOT_PATH;
        return {
            repoId: group.repoId,
            locale: group.locale,
            sourceBranch: group.sourceBranch,
            contentPath,
            importPath: dirname(contentPath),
            selectedContentPaths: group.entries.map(({ sourcePath }) => sourcePath),
            exportName: createExportName(bundle, group, index),
        };
    });
};

const assertUniqueTargets = (entries) => {
    const identities = new Set();
    const paths = new Set();
    entries.forEach((entry) => {
        const identity = `${entry.repoId}:${entry.contentId}`;
        if (identities.has(identity)) {
            throw new Error('Manifest contains duplicate target identities or paths');
        }
        identities.add(identity);
        entry.branches.forEach((branch) => {
            const path = `${entry.repoId}:${branch}:${entry.paths[branch]}`;
            if (paths.has(path)) {
                throw new Error('Manifest contains duplicate target identities or paths');
            }
            paths.add(path);
        });
    });
};

const validateManifest = (manifest) => {
    if (manifest.unresolvedPaths.length > 0) {
        throw new Error(`Manifest has ${manifest.unresolvedPaths.length} unresolved paths`);
    }
    if (manifest.missingContentTypes.length > 0) {
        throw new Error(`Manifest is missing ${manifest.missingContentTypes.length} content types`);
    }
    const unavailableApplications = manifest.applications.filter(
        ({ required, installed, started, version }) =>
            required !== false && (!installed || !started || !version)
    );
    if (unavailableApplications.length > 0) {
        throw new Error(
            `Required project applications are unavailable: ${unavailableApplications.map(({ key }) => key).join(', ')}`
        );
    }
    const projects = manifest.projects.map(({ id, language, parents = [] }) => ({
        id,
        language,
        parents,
    }));
    if (JSON.stringify(projects) !== JSON.stringify(REQUIRED_PROJECTS)) {
        throw new Error(`Manifest has unexpected project topology: ${JSON.stringify(projects)}`);
    }

    if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
        throw new Error('Manifest contains no entries');
    }
    manifest.entries.forEach((entry) => {
        if (
            !entry ||
            !CURATED_REPOSITORIES.includes(entry.repoId) ||
            !isCuratedId(entry.contentId)
        ) {
            throw new Error(`Manifest entry ${entry?.repoId}:${entry?.contentId} is invalid`);
        }
        const validBranches =
            JSON.stringify(entry.branches) === JSON.stringify(['draft', 'master']) ||
            JSON.stringify(entry.branches) === JSON.stringify(['draft']) ||
            JSON.stringify(entry.branches) === JSON.stringify(['master']);
        if (!validBranches) {
            throw new Error(
                `Manifest entry ${entry.repoId}:${entry.contentId} has invalid branches ${entry.branches}`
            );
        }
        const pathBranches = Object.keys(entry.paths || {}).filter((branch) => entry.paths[branch]);
        if (
            JSON.stringify(pathBranches) !== JSON.stringify(entry.branches) ||
            entry.branches.some((branch) => !isCuratedContentPath(entry.paths[branch]))
        ) {
            throw new Error(
                `Manifest entry ${entry.repoId}:${entry.contentId} has invalid branch paths`
            );
        }
        if (entry.branches.some((branch) => !isCuratedId(entry.versions?.[branch]))) {
            throw new Error(
                `Manifest entry ${entry.repoId}:${entry.contentId} is not version-pinned`
            );
        }
    });
    assertUniqueTargets(manifest.entries);
};

// A full import replaces every curated repository branch, so each one needs an export.
const assertFullScopeCoverage = (nativeExports) => {
    const actualKeys = nativeExports.map(({ repoId, sourceBranch }) => `${repoId}:${sourceBranch}`);
    const missingKeys = CURATED_REPOSITORIES.flatMap((repoId) =>
        CURATED_BRANCHES.map((branch) => `${repoId}:${branch}`)
    ).filter((key) => !actualKeys.includes(key));
    if (missingKeys.length > 0) {
        throw new Error(`Manifest has no entries for ${missingKeys.join(', ')}`);
    }
};

const postJson = async (url, body, headers = {}, timeoutMs = MANIFEST_REQUEST_TIMEOUT_MS) => {
    let response;
    try {
        response = await fetchXp(url, {
            method: 'POST',
            signal: AbortSignal.timeout(timeoutMs),
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(body),
        });
    } catch (error) {
        if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
            throw new Error(`Manifest request exceeded ${Math.ceil(timeoutMs / 1000)} seconds`, {
                cause: error,
            });
        }
        throw error;
    }
    const responseBody = await response.text();
    let parsedBody;
    try {
        parsedBody = JSON.parse(responseBody);
    } catch {
        throw new Error(
            `Expected JSON, got ${response.status} ${response.headers.get('content-type') || 'unknown content type'} from ${response.url}`
        );
    }
    return {
        ok: response.ok,
        status: response.status,
        headers: response.headers,
        body: parsedBody,
    };
};

export const createCuratedPlan = async ({
    inputPath,
    paths = [],
    seeds = [],
    serviceUrl,
    auth,
    bundle,
    scope = 'full',
    includeDrafts = false,
    requestTimeoutMs = MANIFEST_REQUEST_TIMEOUT_MS,
}) => {
    if (!isSafeName(bundle)) {
        throw new Error('bundle may only contain letters, numbers, dots, underscores, and hyphens');
    }
    if (!['full', 'page'].includes(scope) || !Array.isArray(paths) || !Array.isArray(seeds)) {
        throw new Error('A full/page selection with paths and seeds arrays is required');
    }
    if (typeof includeDrafts !== 'boolean') {
        throw new Error('includeDrafts must be a boolean');
    }
    const selectedPaths = inputPath ? readPaths(inputPath) : normalizePaths(paths);
    const sessionCookie = await getXpSessionCookie(serviceUrl, auth);
    const response = await postJson(
        serviceUrl,
        { paths: selectedPaths, seeds, scope, includeDrafts },
        { Cookie: sessionCookie },
        requestTimeoutMs
    );

    const manifest = response.body;
    if (!response.ok) {
        throw new Error(
            `Manifest service returned ${response.status}: ${JSON.stringify(manifest)}`
        );
    }
    validateManifest(manifest);
    if (manifest.scope !== scope) {
        throw new Error('Manifest service returned a different selection scope');
    }
    if (manifest.includeDrafts !== includeDrafts) {
        throw new Error('Manifest service returned a different draft selection');
    }
    const nativeExports = createNativeExports(bundle, manifest.entries);
    if (scope === 'full') {
        assertFullScopeCoverage(nativeExports);
    }
    return { ...manifest, bundle, exports: nativeExports };
};

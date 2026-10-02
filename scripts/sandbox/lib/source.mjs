import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as sleep } from 'node:timers/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
    CONTENT_ROOT_PATH,
    CURATED_BRANCHES,
    CURATED_REPOSITORIES,
    fetchXp,
    getSourceAuthHeaders,
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
// Deployed admin hosts only route /webapp, and accept the browser-approved token there.
const WEBAPP_EXPORT_PATH = '/webapp/no.nav.navno/curated-export';
const AUTHORIZATION_TIMEOUT_MS = 5 * 60 * 1000;
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
    serviceUrl: `${origin}${WEBAPP_EXPORT_PATH}/manifest`,
    sourceServiceUrl: `${origin}${WEBAPP_EXPORT_PATH}/source`,
    authorizeUrl: `${origin}${WEBAPP_EXPORT_PATH}/authorize`,
    tokenUrl: `${origin}${WEBAPP_EXPORT_PATH}/token`,
});

const openInBrowser = (url) => {
    const command = { darwin: 'open', linux: 'xdg-open' }[process.platform];
    if (!command) {
        return;
    }
    const child = spawn(command, [url], { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
};

const waitForAuthorizationCode = ({ state, timeoutMs, onListening }) =>
    new Promise((resolvePromise, reject) => {
        let timer;
        const server = createServer((request, response) => {
            const url = new URL(request.url, 'http://127.0.0.1');
            const code = url.searchParams.get('code');
            if (url.pathname !== '/callback') {
                response.writeHead(404).end();
                return;
            }
            // Ignore stray requests; only the redirect carrying our state completes the handoff.
            if (url.searchParams.get('state') !== state || !/^[0-9a-f]{64}$/.test(code ?? '')) {
                response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                response.end('Ugyldig svar fra XP. Start importen på nytt.');
                return;
            }
            response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('Tilgang godkjent. Du kan lukke fanen og gå tilbake til terminalen.');
            finish(null, code);
        });
        const finish = (error, code) => {
            clearTimeout(timer);
            server.close();
            server.closeAllConnections();
            if (error) {
                reject(error);
            } else {
                resolvePromise(code);
            }
        };
        timer = setTimeout(
            () => finish(new Error('Timed out waiting for approval in the browser')),
            timeoutMs
        );
        server.on('error', (error) => finish(error));
        server.listen(0, '127.0.0.1', () => onListening(server.address().port));
    });

// Opens the source's approval page and exchanges the returned one-time code for a short-lived
// read token. The PKCE verifier never leaves this process, so an intercepted code is useless.
export const authorizeDeployedSource = async (
    source,
    {
        openBrowser = openInBrowser,
        fetchImpl = fetchXp,
        timeoutMs = AUTHORIZATION_TIMEOUT_MS,
        log = console.log,
    } = {}
) => {
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('hex');
    const code = await waitForAuthorizationCode({
        state,
        timeoutMs,
        onListening: (port) => {
            const url = new URL(source.authorizeUrl);
            url.searchParams.set('port', String(port));
            url.searchParams.set('state', state);
            url.searchParams.set('challenge', challenge);
            log(`Approve read access to ${source.origin} in your browser:\n${url}`);
            openBrowser(url.href);
        },
    });
    const response = await fetchImpl(source.tokenUrl, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, verifier }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.token !== 'string') {
        throw new Error(`Token exchange with ${source.origin} failed (HTTP ${response.status})`);
    }
    return { token: body.token };
};

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
// Deployed sources build the manifest as a task, since the proxy cuts long requests short.
const MANIFEST_JOB_TIMEOUT_MS = 20 * 60 * 1000;
const MANIFEST_POLL_INTERVAL_MS = 3000;
const MANIFEST_POLL_REQUEST_TIMEOUT_MS = 60 * 1000;

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

const requestJson = async (url, init, timeoutMs) => {
    let response;
    try {
        response = await fetchXp(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
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

const waitForManifestJob = async (
    serviceUrl,
    started,
    headers,
    { jobTimeoutMs, pollIntervalMs, reportCounter }
) => {
    if (started.status !== 202 || typeof started.body?.job !== 'string') {
        return started;
    }
    const jobUrl = new URL(serviceUrl);
    jobUrl.searchParams.set('job', started.body.job);
    const startedAt = Date.now();
    let counterShown = false;
    try {
        while (Date.now() - startedAt < jobTimeoutMs) {
            await sleep(pollIntervalMs);
            const response = await requestJson(
                jobUrl,
                { method: 'GET', headers },
                MANIFEST_POLL_REQUEST_TIMEOUT_MS
            );
            if (response.status !== 202) {
                return response;
            }
            const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
            reportCounter(`\rSource is building the manifest (${elapsedSeconds}s)`);
            counterShown = true;
        }
        throw new Error(`Manifest job exceeded ${Math.ceil(jobTimeoutMs / 1000)} seconds`);
    } finally {
        if (counterShown) {
            reportCounter('\n');
        }
    }
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
    jobTimeoutMs = MANIFEST_JOB_TIMEOUT_MS,
    pollIntervalMs = MANIFEST_POLL_INTERVAL_MS,
    reportCounter = (text) => process.stdout.write(text),
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
    const authHeaders = await getSourceAuthHeaders(serviceUrl, auth);
    const started = await requestJson(
        serviceUrl,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ paths: selectedPaths, seeds, scope, includeDrafts }),
        },
        requestTimeoutMs
    );
    const response = await waitForManifestJob(serviceUrl, started, authHeaders, {
        jobTimeoutMs,
        pollIntervalMs,
        reportCounter,
    });

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

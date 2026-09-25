import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { getXpSessionCookie } from './xp-auth.mjs';
import { fetchXp } from './xp-http.mjs';

const CONTENT_ROOT_PATH = '/content/www.nav.no';
const MANIFEST_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
const REQUIRED_PROJECTS = [
    { id: 'default', language: 'no', parents: [] },
    { id: 'navno-engelsk', language: 'en', parents: ['default'] },
    { id: 'navno-nynorsk', language: 'nn', parents: ['default'] },
];

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

    manifest.entries.forEach((entry) => {
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
            entry.branches.some(
                (branch) =>
                    typeof entry.paths[branch] !== 'string' ||
                    (!entry.paths[branch].startsWith(`${CONTENT_ROOT_PATH}/`) &&
                        entry.paths[branch] !== CONTENT_ROOT_PATH)
            )
        ) {
            throw new Error(
                `Manifest entry ${entry.repoId}:${entry.contentId} has invalid branch paths`
            );
        }
    });
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
    requestTimeoutMs = MANIFEST_REQUEST_TIMEOUT_MS,
}) => {
    if (typeof bundle !== 'string' || !/^(?!\.{1,2}$)[a-zA-Z0-9._-]+$/.test(bundle)) {
        throw new Error('bundle may only contain letters, numbers, dots, underscores, and hyphens');
    }
    if (!['full', 'page'].includes(scope) || !Array.isArray(paths) || !Array.isArray(seeds)) {
        throw new Error('A full/page selection with paths and seeds arrays is required');
    }
    const selectedPaths = inputPath ? readPaths(inputPath) : normalizePaths(paths);
    const sessionCookie = await getXpSessionCookie(serviceUrl, auth);
    const response = await postJson(
        serviceUrl,
        { paths: selectedPaths, seeds, scope },
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
    return {
        ...manifest,
        bundle,
        exports: createNativeExports(bundle, manifest.entries),
    };
};

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEPLOYED_SOURCES = {
    prod: 'https://portal-admin.oera.no',
    dev1: 'https://portal-admin-dev.oera.no',
    dev2: 'https://portal-admin-q6.oera.no',
};

const SERVICE_PATH = '/_/service/no.nav.navno/curatedExportManifest';
const SOURCE_SERVICE_PATH = '/_/service/no.nav.navno/curatedExportSource';
const PROJECT_REPOSITORIES = {
    default: 'com.enonic.cms.default',
    'navno-engelsk': 'com.enonic.cms.navno-engelsk',
    'navno-nynorsk': 'com.enonic.cms.navno-nynorsk',
};
const DEPLOYED_SOURCE_BY_HOST = {
    'www.nav.no': 'prod',
    'nav.no': 'prod',
    'portal-admin.oera.no': 'prod',
    'portal-admin-dev.oera.no': 'dev1',
    'portal-admin-q6.oera.no': 'dev2',
};

const readRunningSandbox = (homeDirectory) => {
    const cliStatePath = join(homeDirectory, '.enonic', '.enonic');
    if (!existsSync(cliStatePath)) {
        return null;
    }

    return readFileSync(cliStatePath, 'utf8').match(/^running = "([^"]+)"$/m)?.[1] ?? null;
};

const getSandboxVersion = (sandboxPath) => {
    const metadata = readFileSync(join(sandboxPath, '.enonic'), 'utf8');
    const distro = metadata.match(/^distro = "([^"]+)"$/m)?.[1];
    const version = distro?.match(/(\d+\.\d+\.\d+(?:[-.][a-zA-Z0-9]+)?)$/)?.[1];
    if (!distro || !version) {
        throw new Error(`Could not determine the XP version from ${sandboxPath}/.enonic`);
    }

    return { distro, version };
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
        ...getSandboxVersion(sandboxPath),
    };
};

export const inferCuratedSourceFromPage = (value) => {
    const url = new URL(value);
    const deployedSource = DEPLOYED_SOURCE_BY_HOST[url.hostname];
    if (deployedSource) {
        return deployedSource;
    }
    if (parseContentStudioPageUrl(value) && !['localhost', '127.0.0.1'].includes(url.hostname)) {
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

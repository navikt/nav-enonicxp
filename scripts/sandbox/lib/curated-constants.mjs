// Mirrors src/main/resources/lib/exports/curated-safety.ts; the XP services validate the same rules.
export const CONTENT_ROOT_PATH = '/content/www.nav.no';

export const REQUIRED_PROJECTS = [
    { id: 'default', language: 'no', parents: [] },
    { id: 'navno-engelsk', language: 'en', parents: ['default'] },
    { id: 'navno-nynorsk', language: 'nn', parents: ['default'] },
];

export const PROJECT_REPOSITORIES = Object.fromEntries(
    REQUIRED_PROJECTS.map(({ id }) => [id, `com.enonic.cms.${id}`])
);

export const CURATED_REPOSITORIES = Object.values(PROJECT_REPOSITORIES);

export const CURATED_BRANCHES = ['draft', 'master'];

export const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const isCuratedId = (value) =>
    typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value);

// Used for sandbox, bundle and export names that become directory names.
export const isSafeName = (value) =>
    typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value);

export const isCuratedContentPath = (path) =>
    typeof path === 'string' &&
    (path === CONTENT_ROOT_PATH || path.startsWith(`${CONTENT_ROOT_PATH}/`)) &&
    // eslint-disable-next-line no-control-regex -- deliberately rejecting control characters in paths
    !/[%\\\u0000-\u001f\u007f]/.test(path) &&
    path
        .slice(1)
        .split('/')
        .every((segment) => segment && segment !== '.' && segment !== '..');

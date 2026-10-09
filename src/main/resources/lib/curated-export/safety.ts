import { Request } from '@enonic-types/core';
import { Project } from '/lib/xp/project';

export const CURATED_CONTENT_ROOT_PATH = '/content/www.nav.no';

export const REQUIRED_PROJECTS = [
    { id: 'default', language: 'no', parents: [] },
    { id: 'navno-engelsk', language: 'en', parents: ['default'] },
    { id: 'navno-nynorsk', language: 'nn', parents: ['default'] },
] as const;

export const CURATED_REPOSITORIES: string[] = REQUIRED_PROJECTS.map(
    ({ id }) => `com.enonic.cms.${id}`
);

export const isCuratedRepository = (value: unknown): value is string =>
    typeof value === 'string' && CURATED_REPOSITORIES.includes(value);

export type CuratedBranch = 'draft' | 'master';

export const isCuratedBranch = (value: unknown): value is CuratedBranch =>
    value === 'draft' || value === 'master';

export const isCuratedContentId = (value: unknown): value is string =>
    typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value);

export const isCuratedContentPath = (value: unknown): value is string => {
    if (
        typeof value !== 'string' ||
        (value !== CURATED_CONTENT_ROOT_PATH &&
            !value.startsWith(`${CURATED_CONTENT_ROOT_PATH}/`)) ||
        /[%\\]/.test(value)
    ) {
        return false;
    }
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code < 0x20 || code === 0x7f) {
            return false;
        }
    }
    return value
        .slice(1)
        .split('/')
        .every((segment) => segment !== '' && segment !== '.' && segment !== '..');
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

export const getProjectParents = (project: Project) => {
    if (project.parents.length > 0) {
        return project.parents;
    }
    return project.parent ? [project.parent] : [];
};

export const hasRequiredProjectTopology = (
    project: Project,
    expected: (typeof REQUIRED_PROJECTS)[number]
) => {
    const parents = getProjectParents(project);
    return (
        project.id === expected.id &&
        project.language === expected.language &&
        parents.length === expected.parents.length &&
        parents.every((parent, index) => parent === expected.parents[index])
    );
};

export const curatedJsonResponse = (status: number, body: Record<string, unknown>) => ({
    status,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'no-store' },
    body,
});

// Browsers cannot send cross-site application/json without a CORS preflight, so requiring it
// blocks CSRF against these cookie-authenticated endpoints.
export const isJsonRequest = (req: Request) =>
    typeof req.contentType === 'string' && /^application\/json\s*(;|$)/i.test(req.contentType);

export const isCuratedImportEnabled = () => {
    const config = app.config as typeof app.config & { curatedImportEnabled?: unknown };
    // Only trusted server configuration may opt a local sandbox into write access.
    return config.env === 'localhost' && config.curatedImportEnabled === 'true';
};

// Set by the sandbox import script while it imports into a local sandbox.
export const isCuratedImportInProgress = () =>
    app.config.env === 'localhost' && app.config.curatedImportInProgress === 'true';

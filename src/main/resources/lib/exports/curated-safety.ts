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

export const isCuratedBranch = (value: unknown): value is 'draft' | 'master' =>
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
        const code = value.codePointAt(index);
        if (code !== undefined && (code < 0x20 || code === 0x7f)) {
            return false;
        }
    }
    return value
        .slice(1)
        .split('/')
        .every((segment) => segment !== '' && segment !== '.' && segment !== '..');
};

export const isCuratedImportEnabled = () => {
    const config = app.config as typeof app.config & { curatedImportEnabled?: unknown };
    // Only trusted server configuration may opt a local sandbox into write access.
    return config.env === 'localhost' && config.curatedImportEnabled === 'true';
};

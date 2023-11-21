import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { runInContext } from '../../context/run-in-context';
import { stripPathPrefix as _stripPathPrefix } from '../path-utils';
import { RepoBranch } from '../../../types/common';

type ContentWithCustomPath = Content & { data: { customPath: string } };

// Valid: (0-9 OR a-z OR - OR / AND NOT trailing /) OR /
const validCustomPathPattern = new RegExp('^(/[0-9a-z-/]*[^/]|/)$');

// For custom paths, we need the leading slash on the root path
const stripPathPrefix = (path: string) => _stripPathPrefix(path) || '/';

export const isValidCustomPath = (path?: string): path is string =>
    typeof path === 'string' && validCustomPathPattern.test(path);

export const hasValidCustomPath = (content: Content): content is ContentWithCustomPath => {
    return isValidCustomPath((content as ContentWithCustomPath).data?.customPath);
};

export const hasInvalidCustomPath = (content: Content): content is ContentWithCustomPath => {
    const customPath = (content as ContentWithCustomPath).data?.customPath;

    return !!(customPath && !isValidCustomPath(customPath));
};

export const getCustomPathFromContent = (contentId: string, versionId?: string) => {
    const content = contentLib.get({ key: contentId, versionId });
    return content && hasValidCustomPath(content) ? content.data.customPath : null;
};

export const getContentFromCustomPath = (path: string, branch: RepoBranch = 'master') => {
    const customPath = stripPathPrefix(path);
    if (!isValidCustomPath(customPath)) {
        return [];
    }

    return runInContext(
        { branch },
        () =>
            contentLib.query({
                start: 0,
                count: 10,
                filters: {
                    boolean: {
                        must: {
                            hasValue: {
                                field: 'data.customPath',
                                values: [customPath],
                            },
                        },
                    },
                },
            }).hits
    );
};

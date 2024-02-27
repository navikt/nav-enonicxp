import { Content } from '/lib/xp/content';
import { hasValidCustomPath } from './custom-paths/custom-path-utils';
import { stripPathPrefix } from './path-utils';
import { isContentLocalized } from '../localization/locale-utils';
import { buildLocalePath } from './locale-paths';

export const getPublicPath = (content: Content, locale: string): string => {
    const basePath = hasValidCustomPath(content)
        ? content.data.customPath
        : stripPathPrefix(content._path);

    return isContentLocalized(content) ? buildLocalePath(basePath, locale) : basePath;
};

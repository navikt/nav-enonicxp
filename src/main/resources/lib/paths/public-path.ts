import { Content } from '/lib/xp/content';
import { hasValidCustomPath } from './custom-paths/custom-path-utils';
import { stripPathPrefix } from './path-utils';
import { buildLocalePath, isContentLocalized } from '../localization/locale-utils';

export const getPublicPath = (content: Content, locale: string) => {
    const basePath = hasValidCustomPath(content)
        ? content.data.customPath
        : stripPathPrefix(content._path);

    return isContentLocalized(content) ? buildLocalePath(basePath, locale) : basePath;
};

import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { contentTypesWithBreadcrumbs } from '../../contenttype-lists';
import { COMPONENT_APP_KEY, NAVNO_ROOT_PATH } from '../../constants';
import { logger } from '../../utils/logging';
import { getParentPath } from '../../paths/path-utils';
import { ContentDescriptor } from '../../../types/content-types/content-config';
import { getPublicPath } from '../../paths/public-path';
import { getLocaleFromContext } from '../../localization/locale-context';

type Breadcrumb = {
    title: string;
    url: string;
};

const allowedContentTypes: ReadonlySet<ContentDescriptor> = new Set(contentTypesWithBreadcrumbs);

// The breadcrumbs trail should stop when we hit any of these paths
const rootPaths: ReadonlySet<string> = new Set([
    NAVNO_ROOT_PATH,
    `${NAVNO_ROOT_PATH}/no/person`,
    `${NAVNO_ROOT_PATH}/no/bedrift`,
    `${NAVNO_ROOT_PATH}/no/samarbeidspartner`,
    `${NAVNO_ROOT_PATH}/no/nav-og-samfunn`,
    `${NAVNO_ROOT_PATH}/en/home`,
    `${NAVNO_ROOT_PATH}/se/samegiella`,
]);

const generateBreadcrumb = (content: Content): Breadcrumb => ({
    title: content.displayName,
    url: getPublicPath(content, getLocaleFromContext()),
});

const getParentContent = (content: Content): Content | null => {
    // If the virtualParent field is set, we use this to generate parent breadcrumb segments
    // instead of the actual parent of the content
    const virtualParentRef = content.x?.[COMPONENT_APP_KEY]?.virtualParent?.virtualParent;
    if (virtualParentRef) {
        const virtualParentContent = contentLib.get({ key: virtualParentRef });

        if (virtualParentContent) {
            return virtualParentContent;
        } else {
            logger.error(
                `Invalid virtual parent specified for content ${content._id} (${content._path})`
            );
        }
    }

    const parentPath = getParentPath(content._path);

    if (!parentPath) {
        return null;
    }

    return contentLib.get({ key: parentPath });
};

const generateBreadcrumbsFromParent = (content: Content, segments: Content[]): Breadcrumb[] | null => {
    const parentContent = getParentContent(content);

    if (!parentContent) {
        logger.error(`Content has invalid parent: ${content._id} (${content._path})`);
        return null;
    }

    // Because we have the option to set a virtual parent from anywhere in the content structure, it
    // is possible to end up with a circular breadcrumbs trail if a descendant of a content (or the
    // content itself) is set as its parent.
    if (segments.some((segmentContent) => segmentContent._id === parentContent._id)) {
        logger.error(`Content has circular breadcrumbs: ${content._id} (${content._path})`);
        return null;
    }

    // Generate more parent segments until we hit one of the root paths
    if (!rootPaths.has(parentContent._path)) {
        return generateBreadcrumbsFromParent(
            parentContent,
            allowedContentTypes.has(parentContent.type) ? [parentContent, ...segments] : segments
        );
    }

    return segments.map(generateBreadcrumb);
};

export const generateBreadcrumbs = (content: Content) => {
    if (!content || !allowedContentTypes.has(content.type) || rootPaths.has(content._path)) {
        return null;
    }

    return generateBreadcrumbsFromParent(content, [content]);
};

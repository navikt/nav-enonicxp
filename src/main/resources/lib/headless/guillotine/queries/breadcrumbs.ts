import contentLib, { Content } from '/lib/xp/content';
import { contentTypesWithBreadcrumbs } from '../../../contenttype-lists';
import { componentAppKey, navnoRootPath } from '../../../constants';
import { getParentPath, stringArrayToSet, stripPathPrefix } from '../../../utils/nav-utils';

type Breadcrumb = {
    title: string;
    url: string;
};

// The breadcrumbs trail should stop when we hit any of these paths
const rootPaths = stringArrayToSet([
    `${navnoRootPath}`,
    `${navnoRootPath}/no/person`,
    `${navnoRootPath}/no/bedrift`,
    `${navnoRootPath}/no/samarbeidspartner`,
    `${navnoRootPath}/no/nav-og-samfunn`,
    `${navnoRootPath}/en/home`,
    `${navnoRootPath}/se/samegiella`,
]);

const generateBreadcrumb = (content: Content): Breadcrumb => ({
    title: content.displayName,
    url: stripPathPrefix(content._path),
});

const getParentContent = (content: Content): Content | null => {
    // If the virtualParent field is set, we use this to generate parent breadcrumb segments
    // instead of the actual parent of the content
    const virtualParentRef = content.x?.[componentAppKey]?.virtualParent?.virtualParent;
    if (virtualParentRef) {
        const virtualParentContent = contentLib.get({ key: virtualParentRef });

        if (virtualParentContent) {
            return virtualParentContent;
        } else {
            log.error(
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

const getParentBreadcrumbs = (content: Content, segments: Content[]): Breadcrumb[] | null => {
    const parentContent = getParentContent(content);

    if (!parentContent) {
        log.error(`Content has invalid parent: ${content._id} (${content._path})`);
        return null;
    }

    // Because we have the option to set a virtual parent from anywhere in the content structure, it
    // is possible to end up with a circular breadcrumbs trail if a descendant of a content is set as
    // its parent.
    if (segments.some((segmentContent) => segmentContent._id === parentContent._id)) {
        log.error(`Content has circular breadcrumbs: ${content._id} (${content._path})`);
        return null;
    }

    // Generate more parent segments until we hit one of the root paths
    if (!rootPaths[parentContent._path]) {
        return getParentBreadcrumbs(
            parentContent,
            contentTypesWithBreadcrumbs[parentContent.type]
                ? [parentContent, ...segments]
                : segments
        );
    }

    return segments.map(generateBreadcrumb);
};

export const getBreadcrumbs = (contentRef: string) => {
    const content = contentLib.get({ key: contentRef });
    if (!content || !contentTypesWithBreadcrumbs[content.type] || rootPaths[content._path]) {
        return null;
    }

    return getParentBreadcrumbs(content, [content]);
};

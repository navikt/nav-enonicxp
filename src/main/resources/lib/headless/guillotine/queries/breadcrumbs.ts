import contentLib, { Content } from '/lib/xp/content';
import { contentTypesWithBreadcrumbs } from '../../../contenttype-lists';
import { componentAppKey, navnoRootPath } from '../../../constants';
import { getParentPath, stringArrayToSet, stripPathPrefix } from '../../../utils/nav-utils';

type Breadcrumb = {
    title: string;
    url: string;
};

const rootPaths = stringArrayToSet([
    `${navnoRootPath}`,
    `${navnoRootPath}/no/person`,
    `${navnoRootPath}/no/bedrift`,
    `${navnoRootPath}/no/samarbeidspartner`,
    `${navnoRootPath}/no/nav-og-samfunn`,
    `${navnoRootPath}/en/home`,
    `${navnoRootPath}/se/samegiella`,
]);

const getParentContent = (content: Content): Content | null => {
    // If the virtualParent field is set, we use this to generate parent breadcrumb segments
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

    if (segments.some((segmentContent) => segmentContent._path === parentContent._path)) {
        log.error(`Content has circular breadcrumbs: ${content._id} (${content._path})`);
        return null;
    }

    if (rootPaths[parentContent._path]) {
        return segments.map((segmentContent) => ({
            title: segmentContent.displayName,
            url: stripPathPrefix(segmentContent._path),
        }));
    }

    return getParentBreadcrumbs(
        parentContent,
        contentTypesWithBreadcrumbs[parentContent.type] ? [parentContent, ...segments] : segments
    );
};

export const getBreadcrumbs = (contentRef: string) => {
    const content = contentLib.get({ key: contentRef });
    if (!content || !contentTypesWithBreadcrumbs[content.type] || rootPaths[content._path]) {
        return null;
    }

    return getParentBreadcrumbs(content, [content]);
};

import { ContentDescriptor } from '../../types/content-types/content-config';
import { NAVNO_NODE_ROOT_PATH } from '../constants';
import { Content } from '/lib/xp/content';
import { RepoConnection } from '/lib/xp/node';
import { NON_LOCALIZED_QUERY_FILTER } from '../localization/layers-repo-utils/localization-state-filters';
import { stripPathPrefix } from '../paths/path-utils';
import { isContentLocalized } from '../localization/locale-utils';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';

type ContentTreeEntry = {
    id: string;
    path: string;
    name: string;
    displayName: string;
    type: ContentDescriptor;
    numChildren: number;
    isLocalized: boolean;
    hasLocalizedDescendants: boolean;
};

// TODO: implement pagination with smaller chunks
const MAX_CHILDREN_COUNT = 1000;

const getFullNodePath = (path: string) => `${NAVNO_NODE_ROOT_PATH}${path.replace(/\/$/, '')}`;

const hasLocalizedDescendants = (content: Content, repo: RepoConnection) => {
    const result = repo.query({
        count: 0,
        query: {
            like: {
                field: '_path',
                value: `${content._path}/*`,
            },
        },
        filters: {
            boolean: {
                mustNot: NON_LOCALIZED_QUERY_FILTER,
            },
        },
    });

    return result.total > 0;
};

const transformToContentTreeEntry = (content: Content, repo: RepoConnection): ContentTreeEntry => {
    const childrenResult = repo.findChildren({
        parentKey: content._id,
        countOnly: true,
    });

    return {
        id: content._id,
        path: stripPathPrefix(content._path),
        name: content._name,
        displayName: content.displayName,
        type: content.type,
        numChildren: childrenResult.total,
        isLocalized: isContentLocalized(content),
        hasLocalizedDescendants: hasLocalizedDescendants(content, repo),
    };
};

const getContentTreeChildren = (
    parentContent: Content,
    repo: RepoConnection
): ContentTreeEntry[] => {
    const findChildrenResult = repo.findChildren({
        parentKey: parentContent._id,
        count: MAX_CHILDREN_COUNT,
    });

    if (findChildrenResult.total > MAX_CHILDREN_COUNT) {
        logger.error(
            `Found ${findChildrenResult.total} children count exceeds the maximum ${MAX_CHILDREN_COUNT}!`
        );
    }

    const ids = findChildrenResult.hits.map((hit) => hit.id);

    const childContents = repo.get<Content>(ids);

    return forceArray(childContents).map((content) => transformToContentTreeEntry(content, repo));
};

export const getContentTreeData = (path: string, locale: string) => {
    const repo = getRepoConnection({
        repoId: getLayersData().localeToRepoIdMap[locale],
        branch: 'draft',
        asAdmin: true,
    });

    const content = repo.get<Content>(getFullNodePath(path));
    if (!content) {
        return null;
    }

    return {
        current: transformToContentTreeEntry(content, repo),
        children: getContentTreeChildren(content, repo),
    };
};

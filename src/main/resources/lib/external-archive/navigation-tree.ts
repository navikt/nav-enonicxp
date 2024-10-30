import { ContentDescriptor } from '../../types/content-types/content-config';
import { NAVNO_NODE_ROOT_PATH } from '../constants';
import { Content } from '/lib/xp/content';
import { RepoConnection } from '/lib/xp/node';
import { NON_LOCALIZED_QUERY_FILTER } from '../localization/layers-repo-utils/localization-state-filters';
import { stripPathPrefix, stripTrailingSlash } from '../paths/path-utils';
import { isContentLocalized } from '../localization/locale-utils';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { getLastPublishedContentVersion } from './get-content';
import { ArchiveContentTree } from './navigation-tree-archive';

type ContentTreeEntry = {
    id: string;
    path: string;
    name: string;
    displayName: string;
    type: ContentDescriptor;
    locale: string;
    numChildren: number;
    isLocalized: boolean;
    hasLocalizedDescendants: boolean;
};

// TODO: implement pagination with smaller chunks
const MAX_CHILDREN_COUNT = 1000;

const getFullNodePath = (path: string) => `${NAVNO_NODE_ROOT_PATH}${stripTrailingSlash(path)}`;

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

const transformToContentTreeEntry = (
    content: Content,
    repo: RepoConnection,
    locale: string
): ContentTreeEntry => {
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
        locale,
        numChildren: childrenResult.total,
        isLocalized: isContentLocalized(content),
        hasLocalizedDescendants: hasLocalizedDescendants(content, repo),
    };
};

const getContentChildren = (
    parentContent: Content,
    repo: RepoConnection,
    locale: string
): ContentTreeEntry[] => {
    const { hits, total } = repo.findChildren({
        parentKey: parentContent._id,
        count: MAX_CHILDREN_COUNT,
        // According to docs it should inherit the childOrder automatically if this is not set,
        // but that does not seem to be the case, so we have to set it ourselves
        childOrder: parentContent.childOrder,
    });

    if (total > MAX_CHILDREN_COUNT) {
        logger.error(`Found ${total} children count exceeds the maximum ${MAX_CHILDREN_COUNT}!`);
    }

    return hits.reduce<ContentTreeEntry[]>((acc, { id }) => {
        const content = getLastPublishedContentVersion(id, locale);
        if (content) {
            acc.push(transformToContentTreeEntry(content, repo, locale));
        }

        return acc;
    }, []);
};

export const buildExternalArchiveNavigationLevel = (
    parentPath: string,
    locale: string,
    fromXpArchive: boolean
) => {
    // TODO: implement this somehow :D
    if (fromXpArchive) {
        const contentTree = new ArchiveContentTree(locale).build();
        return contentTree;
    }

    const nodePath = getFullNodePath(parentPath);

    const content = getLastPublishedContentVersion(nodePath, locale);
    if (!content) {
        return null;
    }

    const repo = getRepoConnection({
        repoId: getLayersData().localeToRepoIdMap[locale],
        branch: 'draft',
        asAdmin: true,
    });

    return {
        current: transformToContentTreeEntry(content, repo, locale),
        children: getContentChildren(content, repo, locale),
    };
};

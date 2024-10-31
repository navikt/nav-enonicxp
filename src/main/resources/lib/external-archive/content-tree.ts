import { NAVNO_NODE_ROOT_PATH } from '../constants';
import { Content } from '/lib/xp/content';
import { RepoConnection } from '/lib/xp/node';
import { stripTrailingSlash } from '../paths/path-utils';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { getLastPublishedContentVersion } from './get-content';
import { ArchiveContentTrees, ArchiveTreeNode } from './content-tree-archive';
import { ContentTreeEntry, transformToContentTreeEntry } from './content-tree-entry';

// TODO: implement pagination with smaller chunks
const MAX_CHILDREN_COUNT = 1000;

const getFullNodePath = (path: string) => `${NAVNO_NODE_ROOT_PATH}${stripTrailingSlash(path)}`;

const getLiveContentChildren = (
    parentContent: Content | null,
    repo: RepoConnection,
    locale: string
): ContentTreeEntry[] => {
    if (!parentContent) {
        return [];
    }

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

const getArchiveContentChildren = (archiveTreeNode: ArchiveTreeNode | null): ContentTreeEntry[] => {
    if (!archiveTreeNode) {
        return [];
    }

    return Object.values(archiveTreeNode.children).map((child) => child.content);
};

type ArchiveContentTreeLevelData = {
    current?: ContentTreeEntry;
    children: ContentTreeEntry[];
};

export const buildExternalArchiveContentTreeLevel = (
    parentPath: string,
    locale: string,
    fromXpArchive: boolean
): ArchiveContentTreeLevelData | null => {
    if (fromXpArchive) {
        const archiveNode = ArchiveContentTrees[locale]?.getContentTreeEntry(parentPath);
        if (!archiveNode) {
            return null;
        }

        return {
            current: archiveNode.content,
            children: getArchiveContentChildren(archiveNode),
        };
    }

    const nodePath = getFullNodePath(parentPath);

    const liveContent = getLastPublishedContentVersion(nodePath, locale);
    const archiveTreeNode = ArchiveContentTrees[locale]?.getContentTreeEntry(parentPath);

    if (!liveContent && !archiveTreeNode) {
        return null;
    }

    const repo = getRepoConnection({
        repoId: getLayersData().localeToRepoIdMap[locale],
        branch: 'draft',
        asAdmin: true,
    });

    return {
        current: liveContent
            ? transformToContentTreeEntry(liveContent, repo, locale)
            : archiveTreeNode?.content,
        children: [
            ...getLiveContentChildren(liveContent, repo, locale),
            ...getArchiveContentChildren(archiveTreeNode),
        ],
    };
};

import { getRepoConnection } from '../repos/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { Content } from '/lib/xp/content';
import { NodeVersion, RepoConnection, RepoNode } from '/lib/xp/node';
import { isArchivedContentNode, isExcludedFromExternalArchive } from '../utils/content-utils';
import { logger } from '../utils/logging';

const transformRepoContentNode = (node: RepoNode<Content>): Content => {
    const { _indexConfig, _inheritsPermissions, _permissions, _childOrder, ...content } = node;

    return { ...content, childOrder: _childOrder };
};

const getContentVersion = (contentId: string, versionId: string, locale: string) => {
    const repo = getRepoConnection({
        repoId: getLayersData().localeToRepoIdMap[locale],
        branch: 'draft',
        asAdmin: true,
    });

    const contentNode = repo.get<Content>({ key: contentId, versionId });
    return contentNode ? transformRepoContentNode(contentNode) : null;
};

export const getLastPublishedContentVersion = (
    contentKey: string,
    locale: string
): Content | null => {
    const repoId = getLayersData().localeToRepoIdMap[locale];

    const masterRepo = getRepoConnection({
        repoId,
        branch: 'master',
        asAdmin: true,
    });

    const publishedContent = masterRepo.get<Content>(contentKey);
    if (publishedContent) {
        return transformRepoContentNode(publishedContent);
    }

    // If the content is not published, we try to find the last version which was published/committed
    const draftRepo = getRepoConnection({
        repoId,
        branch: 'draft',
        asAdmin: true,
    });

    const versions = draftRepo.findVersions({ key: contentKey, count: 1000 });

    const contentNode = getLastPublishedDraftVersion(versions.hits, draftRepo);

    if (!contentNode) {
        return null;
    }

    return transformRepoContentNode(contentNode);
};

const getLastPublishedDraftVersion = (versions: NodeVersion[], draftRepo: RepoConnection) => {
    // Iterate through each object in the list
    for (const version of versions) {
        if (version.commitId) {
            try {
                const contentNode = draftRepo.get<Content>({
                    key: version.nodeId,
                    versionId: version.versionId,
                });
                if (contentNode?.publish?.from) {
                    return contentNode;
                }
            } catch (error) {
                logger.error(`Error fetching object with versionId ${version.versionId}:`, error);
            }
        }
    }

    return null;
};

export const getContentForExternalArchive = ({
    contentId,
    versionId,
    locale,
}: {
    contentId: string;
    versionId?: string;
    locale: string;
}): { content: Content | null; isArchived: boolean } => {
    const latestContent = getRepoConnection({
        branch: 'draft',
        repoId: getLayersData().localeToRepoIdMap[locale],
        asAdmin: true,
    }).get<Content>(contentId);

    const isArchived = !!(latestContent && isArchivedContentNode(latestContent));

    const contentRequested = versionId
        ? getContentVersion(contentId, versionId, locale)
        : getLastPublishedContentVersion(contentId, locale);

    if (contentRequested && isExcludedFromExternalArchive(contentRequested)) {
        return {
            content: null,
            isArchived,
        };
    }

    return {
        content: contentRequested,
        isArchived,
    };
};

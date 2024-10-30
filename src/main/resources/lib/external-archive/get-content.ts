import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';

const transformRepoContentNode = (node: RepoNode<Content>): Content => {
    const { _indexConfig, _inheritsPermissions, _permissions, ...content } = node;

    return content;
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

    const lastPublishedVersion = versions.hits.find((version) => !!version.commitId);
    if (!lastPublishedVersion) {
        return null;
    }

    const contentNode = draftRepo.get<Content>({
        key: lastPublishedVersion.nodeId,
        versionId: lastPublishedVersion.versionId,
    });
    if (!contentNode) {
        return null;
    }

    return transformRepoContentNode(contentNode);
};

export const getContentForExternalArchive = ({
    contentId,
    versionId,
    locale,
}: {
    contentId: string;
    versionId?: string;
    locale: string;
}): Content | null => {
    return versionId
        ? getContentVersion(contentId, versionId, locale)
        : getLastPublishedContentVersion(contentId, locale);
};

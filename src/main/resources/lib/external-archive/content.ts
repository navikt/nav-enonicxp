import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { RepoConnection } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { transformRepoContentNode } from '../utils/content-utils';

type Props = {
    contentId: string;
    versionId?: string;
    locale: string;
};

const getContentVersion = (contentId: string, versionId: string, repo: RepoConnection) => {
    const contentNode = repo.get<Content>({ key: contentId, versionId });
    return contentNode ? transformRepoContentNode(contentNode) : null;
};

export const getLastPublishedContentVersion = (
    contentKey: string,
    repo: RepoConnection
): Content | null => {
    const versions = repo.findVersions({ key: contentKey, count: 1000 });

    if (versions.total === 0) {
        return null;
    }

    const lastPublishedVersion = versions.hits.find((version) => !!version.commitId);
    if (!lastPublishedVersion) {
        return null;
    }

    const contentNode = repo.get<Content>({
        key: lastPublishedVersion.nodeId,
        versionId: lastPublishedVersion.versionId,
    });
    if (!contentNode) {
        return null;
    }

    return transformRepoContentNode(contentNode);
};

export const getContentForExternalArchive = ({ contentId, versionId, locale }: Props) => {
    const repo = getRepoConnection({
        repoId: getLayersData().localeToRepoIdMap[locale],
        branch: 'draft',
        asAdmin: true,
    });

    return versionId
        ? getContentVersion(contentId, versionId, repo)
        : getLastPublishedContentVersion(contentId, repo);
};

import { Content } from '/lib/xp/content';
import { transformRepoContentNode } from '../utils/content-utils';
import { RepoConnection } from '/lib/xp/node';

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

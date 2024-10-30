import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { Content } from '/lib/xp/content';
import { transformRepoContentNode } from '../utils/content-utils';

type Props = {
    contentId: string;
    versionId?: string;
    locale: string;
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
        return publishedContent;
    }

    // If the content is not published, we try to find the last version which was published/committed
    const draftRepo = getRepoConnection({
        repoId,
        branch: 'draft',
        asAdmin: true,
    });

    const versions = draftRepo.findVersions({ key: contentKey, count: 1000 });

    if (versions.total === 0) {
        return null;
    }

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

export const getContentForExternalArchive = ({ contentId, versionId, locale }: Props) => {
    return versionId
        ? getContentVersion(contentId, versionId, locale)
        : getLastPublishedContentVersion(contentId, locale);
};

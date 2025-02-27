import { NodeVersion } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { nodeLibConnectStandard } from './standard-functions';
import { contentTypesWithCustomEditor } from '../contenttype-lists';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { getLayersData } from '../localization/layers-data';
import { getLayersMigrationArchivedContentRef } from './layers-migration-refs';
import { getNodeVersions, GetNodeVersionsParams } from '../utils/version-utils';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../repos/repo-utils';
import { isExcludedFromExternalArchive } from '../utils/content-utils';

export type VersionReferenceEnriched = NodeVersion & {
    locale: string;
    shouldExclude?: boolean;
} & Pick<Content, 'displayName' | 'modifiedTime' | 'type'>;

// Due to a previously existing bug, content types with a custom editor has not always set its
// modifiedTime field correctly. We always need to include all versions for these types.
// For all other content types we only want to include versions where the modifiedTime has changed
const contentTypesWithAllVersionsNeeded: ReadonlySet<ContentDescriptor> = new Set(
    contentTypesWithCustomEditor
);

const enrichVersionReference = (version: NodeVersion, locale: string): VersionReferenceEnriched => {
    const { nodeId, versionId } = version;

    const repo = getRepoConnection({
        branch: 'draft',
        repoId: getLayersData().localeToRepoIdMap[locale],
        asAdmin: true,
    });

    const content = repo.get<Content>({ key: nodeId, versionId });

    if (!content) {
        logger.error(`Content not found for version ${versionId} of ${nodeId} in ${locale}`);
    }

    return {
        ...version,
        locale,
        displayName: content?.displayName || 'Error: displayName was not set',
        modifiedTime: content?.modifiedTime || content?.createdTime,
        shouldExclude: content ? isExcludedFromExternalArchive(content) : undefined,
        type: content?.type || 'base:folder',
    };
};

const getPreLayersMigrationVersions = ({
    nodeKey,
    repoId,
    branch,
}: GetNodeVersionsParams): VersionReferenceEnriched[] => {
    const repo = nodeLibConnectStandard({ repoId, branch: 'draft' });
    const contentNode = repo.get(nodeKey);
    if (!contentNode) {
        return [];
    }

    const archivedContentRef = getLayersMigrationArchivedContentRef({ contentId: nodeKey, repoId });
    if (!archivedContentRef) {
        return [];
    }

    const { archivedRepoId, archivedContentId, migrationTs } = archivedContentRef;

    const preMigrationVersions = getNodeVersions({
        nodeKey: archivedContentId,
        branch: branch,
        repoId: archivedRepoId,
    }).filter(
        (version) => version.nodePath.startsWith('/content') && version.timestamp < migrationTs
    );

    const locale = getLayersData().repoIdToLocaleMap[archivedRepoId];

    return preMigrationVersions.map((version) => enrichVersionReference(version, locale));
};

const sortByTimestamp = (a: VersionReferenceEnriched, b: VersionReferenceEnriched) =>
    a.timestamp < b.timestamp ? 1 : -1;

const filterNonModifiedVersions = (
    version: VersionReferenceEnriched,
    index: number,
    array: VersionReferenceEnriched[]
) => {
    if (contentTypesWithAllVersionsNeeded.has(version.type)) {
        return true;
    }

    const prevVersion = array[index + 1];
    if (!prevVersion) {
        return true;
    }

    return version.modifiedTime !== prevVersion.modifiedTime;
};

// Used by the version history selector in the frontend and the external archive
export const getPublishedAndModifiedVersions = (contentId: string, locale: string) => {
    const repoId = getLayersData().localeToRepoIdMap[locale];

    const params: GetNodeVersionsParams = {
        nodeKey: contentId,
        repoId,
        branch: 'master',
    };

    const normalVersions = getNodeVersions(params).map((version) =>
        enrichVersionReference(version, locale)
    );

    const preLayersMigrationVersions = getPreLayersMigrationVersions(params);

    return [...normalVersions, ...preLayersMigrationVersions]
        .sort(sortByTimestamp)
        .filter(filterNonModifiedVersions);
};

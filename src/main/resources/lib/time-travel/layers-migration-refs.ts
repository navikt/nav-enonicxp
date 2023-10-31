import { getRepoConnection } from '../utils/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { logger } from '../utils/logging';
import { getLayerMigrationData } from '../localization/layers-migration/migration-data';

export const getLayersMigrationArchivedContentRef = ({
    contentId,
    repoId,
}: {
    contentId: string;
    repoId: string;
}) => {
    const rootRepo = getRepoConnection({
        branch: 'draft',
        repoId: CONTENT_ROOT_REPO_ID,
        asAdmin: true,
    });

    const result = rootRepo.query({
        count: 2,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data._layerMigration.contentId',
                            values: [contentId],
                        },
                    },
                    {
                        hasValue: {
                            field: 'data._layerMigration.repoId',
                            values: [repoId],
                        },
                    },
                    {
                        hasValue: {
                            field: 'data._layerMigration.targetReferenceType',
                            values: ['live'],
                        },
                    },
                ],
            },
        },
    }).hits;

    if (result.length === 0) {
        return null;
    }

    if (result.length > 1) {
        logger.critical(`Multiple archived content found for ${contentId} / ${repoId}`);
        return null;
    }

    const contentNode = rootRepo.get(result[0].id);
    if (!contentNode) {
        logger.critical(`No archived content node found for ${contentId} / ${repoId}`);
        return null;
    }

    const migrationTs = getLayerMigrationData(contentNode)?.ts;
    if (!migrationTs) {
        logger.critical(`No migration timestamp found for ${contentId} / ${repoId}`);
        return null;
    }

    return {
        archivedContentId: result[0].id,
        archivedRepoId: CONTENT_ROOT_REPO_ID,
        migrationTs,
    };
};

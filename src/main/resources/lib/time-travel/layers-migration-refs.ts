import { getRepoConnection } from '../utils/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { logger } from '../utils/logging';

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

    return { archivedContentId: result[0].id, archivedRepoId: CONTENT_ROOT_REPO_ID };
};

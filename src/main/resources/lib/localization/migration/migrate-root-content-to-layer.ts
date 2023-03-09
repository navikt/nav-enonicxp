import { getLayersData } from '../layers-data';
import { getRepoConnection } from '../../utils/repo-connection';
import { logger } from '../../utils/logging';
import { RepoBranch } from '../../../types/common';

type ContentMigrationParams = {
    sourceContentId: string;
    sourceLocale: string;
    targetContentId: string;
    targetLocale: string;
};

const migrateBranch = (
    { sourceContentId, sourceLocale, targetContentId, targetLocale }: ContentMigrationParams,
    branch: RepoBranch
) => {
    const { localeToRepoIdMap } = getLayersData();

    const sourceRepo = getRepoConnection({
        branch,
        repoId: localeToRepoIdMap[sourceLocale],
        asAdmin: true,
    });

    const targetRepo = getRepoConnection({
        branch,
        repoId: localeToRepoIdMap[targetLocale],
        asAdmin: true,
    });

    const sourceContent = sourceRepo.get(sourceContentId);
    if (!sourceContent) {
        logger.error(`Content not found for source id ${sourceContentId}`);
        return null;
    }

    const targetContent = targetRepo.get(targetContentId);
    if (!targetContent) {
        logger.error(`Content not found for target id ${sourceContentId}`);
        return null;
    }

    const sourceLogString = `[${sourceLocale}] ${sourceContent._path}`;
    const targetLogString = `[${targetLocale}] ${targetContent._path}`;

    const modifyTargetResult = targetRepo.modify({
        key: targetContentId,
        editor: (_) => {
            logger.info(`Copying content from ${sourceLogString} to ${targetLogString}`);

            return sourceContent;
        },
    });

    if (!modifyTargetResult) {
        logger.error(
            `Failed to modify target ${targetLogString} with source content from ${sourceLogString}`
        );
        return null;
    }

    return 'Great success!';
};

export const migrateRootContentToLayer = (contentMigrationParams: ContentMigrationParams) => {
    migrateBranch(contentMigrationParams, 'draft');
    migrateBranch(contentMigrationParams, 'master');

    return 'Great success!';
};

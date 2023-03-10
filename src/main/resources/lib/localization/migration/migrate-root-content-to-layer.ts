import { getLayersData } from '../layers-data';
import { getRepoConnection } from '../../utils/repo-connection';
import { logger } from '../../utils/logging';
import { RepoBranch } from '../../../types/common';
import { CONTENT_REPO_PREFIX } from '../../constants';
import { transformNodeContentWithJavaTypes } from './transform-node-content-with-java-types';

type ContentMigrationParams = {
    sourceContentId: string;
    sourceLocale: string;
    targetContentId: string;
    targetLocale: string;
};

const getProjectIdFromLocale = (locale: string) => {
    const { localeToRepoIdMap } = getLayersData();

    return localeToRepoIdMap[locale].replace(`${CONTENT_REPO_PREFIX}.`, '');
};

const transformToLayerContent = (content: any, sourceLocale: string, targetLocale: string) => {
    // Remove the legacy languages field
    content.data = { ...content.data, languages: undefined };

    return {
        ...transformNodeContentWithJavaTypes(content),
        originProject: getProjectIdFromLocale(sourceLocale),
        inherit: ['PARENT', 'SORT'],
        language: targetLocale,
    };
};

const migrateBranch = (
    { sourceContentId, sourceLocale, targetContentId, targetLocale }: ContentMigrationParams,
    sourceBranch: RepoBranch
) => {
    const { localeToRepoIdMap } = getLayersData();

    const sourceRepo = getRepoConnection({
        branch: sourceBranch,
        repoId: localeToRepoIdMap[sourceLocale],
        asAdmin: true,
    });

    const targetDraftRepo = getRepoConnection({
        branch: 'draft',
        repoId: localeToRepoIdMap[targetLocale],
        asAdmin: true,
    });

    const sourceContent = sourceRepo.get(sourceContentId);
    if (!sourceContent) {
        logger.error(`Content not found for source id ${sourceContentId}`);
        return null;
    }

    const targetContent = targetDraftRepo.get(targetContentId);
    if (!targetContent) {
        logger.error(`Content not found for target id ${sourceContentId}`);
        return null;
    }

    const sourceLogString = `[${sourceLocale}] ${sourceContent._path}`;
    const targetLogString = `[${targetLocale}] ${targetContent._path}`;

    const modifyResult = targetDraftRepo.modify({
        key: targetContentId,
        editor: (_) => {
            logger.info(`Copying content from ${sourceLogString} to ${targetLogString}`);

            return transformToLayerContent(sourceContent, sourceLocale, targetLocale);
        },
    });

    if (!modifyResult) {
        logger.error(
            `Failed to modify target content ${targetLogString} with source content ${sourceLogString}`
        );
        return null;
    }

    targetDraftRepo.refresh();

    if (sourceBranch === 'master') {
        const pushResult = targetDraftRepo.push({
            key: targetContentId,
            target: 'master',
            resolve: false,
        });
        pushResult.failed.forEach(({ id, reason }) => `Pushing ${id} to master failed: ${reason}`);
        pushResult.success.forEach((id) => `Pushing ${id} to master succeeded`);
    }

    return 'Great success!';
};

const isDraftAndMasterSameVersion = (contentId: string, locale: string) => {
    const repoId = getLayersData().localeToRepoIdMap[locale];

    const draftContent = getRepoConnection({ branch: 'draft', repoId }).get(contentId);
    const masterContent = getRepoConnection({ branch: 'master', repoId }).get(contentId);

    return draftContent?._versionKey === masterContent?._versionKey;
};

export const migrateRootContentToLayer = (contentMigrationParams: ContentMigrationParams) => {
    const { sourceContentId, sourceLocale } = contentMigrationParams;

    migrateBranch(contentMigrationParams, 'master');

    if (!isDraftAndMasterSameVersion(sourceContentId, sourceLocale)) {
        migrateBranch(contentMigrationParams, 'draft');
    }

    return 'Great success!';
};

import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { getLayersData } from '../layers-data';
import {
    getContentProjectIdFromRepoId,
    getRepoConnection,
    isDraftAndMasterSameVersion,
} from '../../utils/repo-utils';
import { logger } from '../../utils/logging';
import { RepoBranch } from '../../../types/common';
import { transformNodeContentToIndexableTypes } from './transform-node-content-to-indexable-types';
import { archiveMigratedContent } from './archive-migrated-content';
import { generateLayerMigrationData } from './migration-data';
import { updateContentReferences } from './update-content-references';
import { toggleCacheInvalidationOnNodeEvents } from '../../cache/invalidate-event-defer';

export type ContentMigrationParams = {
    sourceContentId: string;
    sourceLocale: string;
    targetContentId: string;
    targetLocale: string;
};

export type LayerMigrationResult = {
    result: 'success' | 'error';
    message: string;
};

const transformToLayerContent = (
    sourceContent: RepoNode<Content>,
    sourceLocale: string,
    targetLocale: string
) => {
    const sourceRepoId = getLayersData().localeToRepoIdMap[sourceLocale];

    return {
        ...transformNodeContentToIndexableTypes(sourceContent),
        layerMigration: generateLayerMigrationData({
            type: 'live',
            archivedContentId: sourceContent._id,
            archivedLocale: sourceLocale,
            archivedRepoId: sourceRepoId,
        }),
        originProject: getContentProjectIdFromRepoId(sourceRepoId),
        inherit: ['PARENT', 'SORT'],
        language: targetLocale,
    };
};

const migrateBranch = (
    { sourceContentId, sourceLocale, targetContentId, targetLocale }: ContentMigrationParams,
    sourceBranch: RepoBranch
): boolean => {
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
        return false;
    }

    const targetContent = targetDraftRepo.get(targetContentId);
    if (!targetContent) {
        logger.error(`Content not found for target id ${sourceContentId}`);
        return false;
    }

    const sourceLogString = `[${sourceLocale}] ${sourceContent._path}`;
    const targetLogString = `[${targetLocale}] ${targetContent._path}`;

    const modifyResult = targetDraftRepo.modify({
        key: targetContentId,
        editor: (_) => {
            logger.info(`Duplicating content from ${sourceLogString} to ${targetLogString}`);
            return transformToLayerContent(sourceContent, sourceLocale, targetLocale);
        },
    });

    if (!modifyResult) {
        logger.error(
            `Failed to modify target content ${targetLogString} with source content ${sourceLogString}`
        );
        return false;
    }

    if (sourceBranch !== 'master') {
        return true;
    }

    const pushResult = targetDraftRepo.push({
        key: targetContentId,
        target: 'master',
        resolve: false,
    });

    pushResult.failed.forEach(({ id, reason }) => `Pushing ${id} to master failed: ${reason}`);
    pushResult.success.forEach((id) => `Pushing ${id} to master succeeded`);

    return pushResult.success.length > 0;
};

export const migrateContentToLayer = (
    contentMigrationParams: ContentMigrationParams
): LayerMigrationResult => {
    toggleCacheInvalidationOnNodeEvents({ shouldDefer: true });
    const { sourceContentId, sourceLocale, targetContentId, targetLocale } = contentMigrationParams;

    const logPrefix = `Migrering fra [${sourceLocale}] ${sourceContentId} til [${targetLocale}] ${targetContentId}`;

    const didMigrateMaster = migrateBranch(contentMigrationParams, 'master');
    if (!didMigrateMaster) {
        return { result: 'error', message: `${logPrefix} mislyktes. Sjekk logger for detaljer.` };
    }

    const didUpdateRefs = updateContentReferences(contentMigrationParams);
    if (!didUpdateRefs) {
        logger.error(`Oh noes, failed to update refs!`);
    }

    toggleCacheInvalidationOnNodeEvents({ shouldDefer: false });

    const sourceRepoId = getLayersData().localeToRepoIdMap[sourceLocale];

    if (!isDraftAndMasterSameVersion(sourceContentId, sourceRepoId)) {
        const didMigrateDraft = migrateBranch(contentMigrationParams, 'draft');
        if (!didMigrateDraft) {
            return {
                result: 'error',
                message: `${logPrefix} for innhold under arbeid mislyktes. Sjekk logger for detaljer.`,
            };
        }
    }

    const didArchive = archiveMigratedContent({
        preMigrationContentId: sourceContentId,
        postMigrationContentId: targetContentId,
        preMigrationLocale: sourceLocale,
        postMigrationLocale: targetLocale,
    });

    if (!didArchive) {
        return {
            result: 'success',
            message: `${logPrefix} ble utført, men arkivering av gammelt innhold feilet. Sjekk logger for detaljer.`,
        };
    }

    return {
        result: 'success',
        message: `${logPrefix} var vellykket!`,
    };
};
import { RepoNode } from '/lib/xp/node';
import { getLayersData } from '../layers-data';
import {
    getContentProjectIdFromRepoId,
    getRepoConnection,
    isDraftAndMasterSameVersion,
} from '../../utils/repo-utils';
import { logger } from '../../utils/logging';
import { RepoBranch } from '../../../types/common';
import { toggleCacheInvalidationOnNodeEvents } from '../../cache/invalidate-event-defer';
import { updateContentReferences } from './update-content-references';
import { modifyContentNode } from './modify-content-node';
import { COMPONENT_APP_KEY } from '../../constants';
import { generateLayerMigrationData } from './migration-data';

export type ContentMigrationParams = {
    sourceId: string;
    sourceLocale: string;
    targetId: string;
    targetLocale: string;
};

export type LayerMigrationResult = {
    result: 'success' | 'error';
    message: string;
};

const transformToLayerContent = (
    sourceContent: RepoNode<any>,
    sourceLocale: string,
    targetLocale: string
) => {
    const sourceRepoId = getLayersData().localeToRepoIdMap[sourceLocale];

    return {
        ...sourceContent,
        x: {
            ...sourceContent.x,
            [COMPONENT_APP_KEY]: {
                layerMigration: generateLayerMigrationData({
                    targetType: 'archived',
                    contentId: sourceContent._id,
                    locale: sourceLocale,
                    repoId: sourceRepoId,
                }),
            },
        },
        originProject: getContentProjectIdFromRepoId(sourceRepoId),
        inherit: ['PARENT', 'SORT'],
        language: targetLocale,
    };
};

const migrateBranch = (params: ContentMigrationParams, branch: RepoBranch) => {
    const { sourceId, sourceLocale, targetId, targetLocale } = params;

    const { localeToRepoIdMap } = getLayersData();

    const sourceRepo = getRepoConnection({
        branch: branch,
        repoId: localeToRepoIdMap[sourceLocale],
        asAdmin: true,
    });

    const targetRepoDraft = getRepoConnection({
        branch: 'draft',
        repoId: localeToRepoIdMap[targetLocale],
        asAdmin: true,
    });

    const sourceContent = sourceRepo.get(sourceId);
    if (!sourceContent) {
        logger.error(`Source node not found: [${sourceLocale}] ${sourceId} in branch ${branch}`);
        return false;
    }

    const targetContent = targetRepoDraft.get(targetId);
    if (!targetContent) {
        logger.error(`Target node not found: [${targetLocale}] ${targetId}`);
        return false;
    }

    modifyContentNode({
        key: targetId,
        locale: targetLocale,
        editorFunc: () => {
            logger.info(`Copying node content from ${sourceId} to ${sourceId}`);
            return transformToLayerContent(sourceContent, sourceLocale, targetLocale);
        },
    });

    if (branch !== 'master') {
        return true;
    }

    const pushResult = targetRepoDraft.push({
        key: targetId,
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

    const { sourceId, sourceLocale, targetId, targetLocale } = contentMigrationParams;

    const responseMsgPrefix = `Migrering fra [${sourceLocale}] ${sourceId} til [${targetLocale}] ${targetId}`;

    const copyMasterSuccess = migrateBranch(contentMigrationParams, 'master');
    if (!copyMasterSuccess) {
        return {
            result: 'error',
            message: `${responseMsgPrefix} mislyktes. Sjekk logger for detaljer.`,
        };
    }

    const sourceRepoId = getLayersData().localeToRepoIdMap[sourceLocale];

    if (!isDraftAndMasterSameVersion(sourceId, sourceRepoId)) {
        const copyDraftSuccess = migrateBranch(contentMigrationParams, 'draft');
        if (!copyDraftSuccess) {
            return {
                result: 'error',
                message: `${responseMsgPrefix} for innhold under arbeid mislyktes. Sjekk logger for detaljer.`,
            };
        }
    }

    const didUpdateRefs = updateContentReferences(contentMigrationParams);
    if (!didUpdateRefs) {
        logger.error(`Oh noes, failed to update refs!`);
    }

    // const didArchive = archiveMigratedContent({
    //     preMigrationContentId: sourceContentId,
    //     postMigrationContentId: targetContentId,
    //     preMigrationLocale: sourceLocale,
    //     postMigrationLocale: targetLocale,
    // });
    //
    // if (!didArchive) {
    //     return {
    //         result: 'success',
    //         message: `${logPrefix} ble utført, men arkivering av gammelt innhold feilet. Sjekk logger for detaljer.`,
    //     };
    // }

    toggleCacheInvalidationOnNodeEvents({ shouldDefer: false });

    return {
        result: 'success',
        message: `${responseMsgPrefix} var vellykket!`,
    };
};

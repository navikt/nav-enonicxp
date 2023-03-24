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
import { generateLayerMigrationData } from './migration-data';
import { toggleCacheInvalidationOnNodeEvents } from '../../cache/invalidate-event-defer';
import { runInLocaleContext } from '../locale-context';
import * as contentLib from '/lib/xp/content';
import { copyContentNode } from './migration-utils';

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

export const migrateContentToLayer = (
    contentMigrationParams: ContentMigrationParams
): LayerMigrationResult => {
    toggleCacheInvalidationOnNodeEvents({ shouldDefer: true });
    const { sourceId, sourceLocale, targetId, targetLocale } = contentMigrationParams;

    const logPrefix = `Migrering fra [${sourceLocale}] ${sourceId} til [${targetLocale}] ${targetId}`;

    const copyMasterSuccess = copyContentNode({ ...contentMigrationParams, branch: 'master' });
    if (!copyMasterSuccess) {
        return { result: 'error', message: `${logPrefix} mislyktes. Sjekk logger for detaljer.` };
    }

    // const didUpdateRefs = updateContentReferences(contentMigrationParams);
    // if (!didUpdateRefs) {
    //     logger.error(`Oh noes, failed to update refs!`);
    // }

    toggleCacheInvalidationOnNodeEvents({ shouldDefer: false });

    const sourceRepoId = getLayersData().localeToRepoIdMap[sourceLocale];

    const sourceRepo = getRepoConnection({ repoId: sourceRepoId, branch: 'master', asAdmin: true });

    logger.info(
        `Diff: ${JSON.stringify(
            sourceRepo.diff({ key: sourceId, target: 'draft', includeChildren: false })
        )}`
    );

    if (!isDraftAndMasterSameVersion(sourceId, sourceRepoId)) {
        const copyDraftSuccess = copyContentNode({ ...contentMigrationParams, branch: 'draft' });
        if (!copyDraftSuccess) {
            return {
                result: 'error',
                message: `${logPrefix} for innhold under arbeid mislyktes. Sjekk logger for detaljer.`,
            };
        }
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

    return {
        result: 'success',
        message: `${logPrefix} var vellykket!`,
    };
};

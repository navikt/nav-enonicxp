import { RepoNode } from '/lib/xp/node';
import { getLayersData } from '../layers-data';
import {
    getContentProjectIdFromRepoId,
    getRepoConnection,
    isDraftAndMasterSameVersion,
} from '../../utils/repo-utils';
import { logger } from '../../utils/logging';
import { RepoBranch } from '../../../types/common';
import { updateContentReferences } from './update-content-references';
import { modifyContentNode } from './modify-content-node';
import { insertLayerMigrationXData } from './migration-data';
import { archiveMigratedContent } from './archive-migrated-content';

export type ContentMigrationParams = {
    sourceId: string;
    sourceLocale: string;
    targetId: string;
    targetLocale: string;
};

export type LayerMigrationResult = {
    errorMsgs: string[];
    statusMsgs: string[];
};

const transformToLayerContent = (
    sourceContent: RepoNode<any>,
    sourceLocale: string,
    targetLocale: string
) => {
    const sourceRepoId = getLayersData().localeToRepoIdMap[sourceLocale];

    return insertLayerMigrationXData({
        content: {
            ...sourceContent,
            originProject: getContentProjectIdFromRepoId(sourceRepoId),
            inherit: ['PARENT', 'SORT'],
            language: targetLocale,
        },
        migrationParams: {
            targetReferenceType: 'archived',
            contentId: sourceContent._id,
            locale: sourceLocale,
            repoId: sourceRepoId,
        },
    });
};

const migrateBranch = (params: ContentMigrationParams, branch: RepoBranch) => {
    const { sourceId, sourceLocale, targetId, targetLocale } = params;

    const { localeToRepoIdMap } = getLayersData();

    const sourceRepo = getRepoConnection({
        branch: branch,
        repoId: localeToRepoIdMap[sourceLocale],
        asAdmin: true,
    });

    const sourceContent = sourceRepo.get(sourceId);
    if (!sourceContent) {
        logger.error(`Source node not found: [${sourceLocale}] ${sourceId} in branch ${branch}`);
        return false;
    }

    const targetRepoId = localeToRepoIdMap[targetLocale];

    const targetRepoDraft = getRepoConnection({
        branch: 'draft',
        repoId: targetRepoId,
        asAdmin: true,
    });

    const targetContent = targetRepoDraft.get(targetId);
    if (!targetContent) {
        logger.error(`Target node not found: [${targetLocale}] ${targetId}`);
        return false;
    }

    modifyContentNode({
        key: targetId,
        repoId: targetRepoId,
        requireValid: false,
        editor: () => {
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

export const migrateContentToLayer = (contentMigrationParams: ContentMigrationParams) => {
    const { sourceId, sourceLocale, targetId, targetLocale } = contentMigrationParams;

    const response: LayerMigrationResult = {
        errorMsgs: [],
        statusMsgs: [
            `Migrering fra [${sourceLocale}] ${sourceId} til [${targetLocale}] ${targetId} - resultat:`,
        ],
    };

    const copyMasterSuccess = migrateBranch(contentMigrationParams, 'master');
    if (copyMasterSuccess) {
        response.statusMsgs.push('Migrering av publisert innhold var vellykket.');
    } else {
        response.errorMsgs.push(
            'Migrering av publisert innhold feilet. Sjekk logger for detaljer.'
        );
        return response;
    }

    const sourceRepoId = getLayersData().localeToRepoIdMap[sourceLocale];
    if (!isDraftAndMasterSameVersion(sourceId, sourceRepoId)) {
        const copyDraftSuccess = migrateBranch(contentMigrationParams, 'draft');
        if (copyDraftSuccess) {
            response.statusMsgs.push('Migrering av innhold under arbeid var vellykket.');
        } else {
            response.errorMsgs.push(
                'Migrering av innhold under arbeid feilet. Sjekk logger for detaljer.'
            );
        }
    } else {
        response.statusMsgs.push('Innhold er ikke under arbeid (ikke noe å migrere).');
    }

    const didUpdateRefs = updateContentReferences(contentMigrationParams);
    if (didUpdateRefs) {
        response.statusMsgs.push('Oppdatering av referanser var vellykket.');
    } else {
        response.errorMsgs.push('Oppdatering av referanser feilet. Sjekk logger for detaljer.');
    }

    const didArchive = archiveMigratedContent({
        preMigrationContentId: sourceId,
        postMigrationContentId: targetId,
        preMigrationLocale: sourceLocale,
        postMigrationLocale: targetLocale,
    });
    if (didArchive) {
        response.statusMsgs.push('Arkivering av migreringskilde var vellykket.');
    } else {
        response.errorMsgs.push('Arkivering av migreringskilde feilet. Sjekk logger for detaljer.');
    }

    return response;
};

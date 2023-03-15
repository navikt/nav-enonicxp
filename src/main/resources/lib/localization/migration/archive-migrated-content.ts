import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { logger } from '../../utils/logging';
import { runInLocaleContext } from '../locale-context';
import { getLayersData } from '../layers-data';
import { getRepoConnection } from '../../utils/repo-utils';

type ArchiveMigratedContentParams = {
    preMigrationContentId: string;
    preMigrationLocale: string;
    postMigrationContentId: string;
    postMigrationLocale: string;
};

const transformToArchivedContent = (
    preMigrationContent: Content,
    postMigrationLocale: string,
    postMigrationContentId: string
) => {
    const targetRepoId = getLayersData().localeToRepoIdMap[postMigrationLocale];

    return {
        ...preMigrationContent,
        displayName: `${preMigrationContent.displayName} - Migrert til layer: [${postMigrationLocale}] ${postMigrationContentId}`,
        layerMigration: {
            targetLocale: postMigrationLocale,
            targetRepoId: targetRepoId,
            targetContentId: postMigrationContentId,
            migrationTs: Date.now(),
        },
    };
};

export const archiveMigratedContent = (params: ArchiveMigratedContentParams): boolean => {
    const {
        preMigrationContentId,
        preMigrationLocale,
        postMigrationContentId,
        postMigrationLocale,
    } = params;

    const preMigrationLogString = `[${preMigrationLocale}] ${preMigrationContentId}`;

    const contextParams = { locale: preMigrationLocale, branch: 'draft' } as const;

    const preMigrationContent = runInLocaleContext(contextParams, () =>
        contentLib.get({ key: preMigrationContentId })
    );

    if (!preMigrationContent) {
        logger.error(`Pre migration content not found: ${preMigrationLogString}`);
        return false;
    }

    // const unpublishResult = runInLocaleContext(contextParams, () =>
    //     contentLib.unpublish({ keys: [preMigrationContentId] })
    // );
    //
    // if (unpublishResult.length === 0) {
    //     logger.error(`Failed to unpublish content: ${preMigrationLogString}`);
    // }

    const sourceRepoId = getLayersData().localeToRepoIdMap[preMigrationLocale];

    const modifyResult = getRepoConnection({
        branch: 'draft',
        repoId: sourceRepoId,
        asAdmin: true,
    }).modify({
        key: preMigrationContentId,
        editor: (content) => {
            return transformToArchivedContent(content, postMigrationLocale, postMigrationContentId);
        },
    });

    if (!modifyResult) {
        logger.error(`Failed to modify content before archiving: ${preMigrationLogString}`);
        return false;
    }

    let didArchiveAll = true;

    getLayersData().locales.forEach((locale) => {
        const archiveResult = runInLocaleContext({ locale, branch: 'draft' }, () =>
            contentLib.archive({ content: preMigrationContentId })
        );

        if (archiveResult.length === 0) {
            logger.error(
                `Failed to archive content in layer for ${locale}: ${preMigrationContentId}`
            );
        } else {
            logger.error(`Archived content in layer for ${locale}: ${preMigrationContentId}`);
            didArchiveAll = false;
        }
    });

    return didArchiveAll;
};

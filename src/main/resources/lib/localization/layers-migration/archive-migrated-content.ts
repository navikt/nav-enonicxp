import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { logger } from '../../utils/logging';
import { runInLocaleContext } from '../locale-context';
import { getLayersData } from '../layers-data';
import { getRepoConnection } from '../../utils/repo-utils';
import { generateLayerMigrationData } from './migration-data';

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
    return {
        ...preMigrationContent,
        displayName: `${preMigrationContent.displayName} - Migrert til layer: [${postMigrationLocale}] ${postMigrationContentId}`,
        layerMigration: generateLayerMigrationData({
            targetReferenceType: 'live',
            contentId: postMigrationContentId,
            locale: postMigrationLocale,
            repoId: getLayersData().localeToRepoIdMap[postMigrationLocale],
        }),
    };
};

export const archiveMigratedContent = (params: ArchiveMigratedContentParams): boolean => {
    const {
        preMigrationContentId,
        preMigrationLocale,
        postMigrationContentId,
        postMigrationLocale,
    } = params;

    const { localeToRepoIdMap, locales } = getLayersData();

    const preMigrationLogString = `[${preMigrationLocale}] ${preMigrationContentId}`;

    const contextParams = { locale: preMigrationLocale, branch: 'draft' } as const;

    const preMigrationContent = runInLocaleContext(contextParams, () =>
        contentLib.get({ key: preMigrationContentId })
    );

    if (!preMigrationContent) {
        logger.error(`Pre migration content not found: ${preMigrationLogString}`);
        return false;
    }

    const sourceRepoId = localeToRepoIdMap[preMigrationLocale];

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

    locales.forEach((locale) => {
        try {
            const archiveResult = runInLocaleContext({ locale, branch: 'draft' }, () =>
                contentLib.archive({ content: preMigrationContentId })
            );

            if (archiveResult.length === 0) {
                logger.error(
                    `Failed to archive content in layer for ${locale}: ${preMigrationContentId}`
                );
                didArchiveAll = false;
            } else {
                logger.info(`Archived content in layer for ${locale}: ${preMigrationContentId}`);
            }
        } catch (e) {
            logger.error(
                `Error while archiving content in layer for ${locale}: ${preMigrationContentId} - ${e}`
            );
            didArchiveAll = false;
        }
    });

    return didArchiveAll;
};

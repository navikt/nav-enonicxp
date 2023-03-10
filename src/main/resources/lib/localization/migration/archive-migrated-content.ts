import * as contentLib from '/lib/xp/content';
import { logger } from '../../utils/logging';
import { runInLocaleContext } from '../locale-context';
import { getLayersData } from '../layers-data';

type ArchiveMigratedContentParams = {
    preMigrationContentId: string;
    preMigrationLocale: string;
    postMigrationContentId: string;
    postMigrationLocale: string;
};

export const archiveMigratedContent = ({
    preMigrationContentId,
    preMigrationLocale,
    postMigrationContentId,
    postMigrationLocale,
}: ArchiveMigratedContentParams) => {
    const preMigrationLogString = `[${preMigrationLocale}] ${preMigrationContentId}`;
    const postMigrationLogString = `[${postMigrationLocale}] ${postMigrationContentId}`;

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

    const modifyResult = runInLocaleContext(contextParams, () =>
        contentLib.modify({
            key: preMigrationContentId,
            editor: (content) => {
                content.displayName = `${content.displayName} - Migrert til layer: ${postMigrationLogString}`;
                return content;
            },
        })
    );

    if (!modifyResult) {
        logger.error(`Failed to modify content before archiving: ${preMigrationLogString}`);
        return false;
    }

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
        }
    });

    return true;
};

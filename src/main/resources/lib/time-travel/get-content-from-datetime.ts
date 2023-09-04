import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInContext } from '../context/run-in-context';
import { runInTimeTravelContext } from './run-with-time-travel';
import { runSitecontentGuillotineQuery } from '../guillotine/queries/run-sitecontent-query';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { getLayerMigrationData } from '../localization/layers-migration/migration-data';

// If the content contains a reference to another archived/migrated content, and the requested
// timestamp matches a time prior to the migration, we try to retrieve the pre-migration content
// from the archive, rather than the current live content
const getBaseContentDataForRequestedTime = (
    contentId: string,
    repoId: string,
    requestedTimestamp: string
): { baseContentKey: string; baseRepoId: string } | null => {
    const content = getRepoConnection({ branch: 'draft', repoId, asAdmin: true }).get({
        key: contentId,
    });
    if (!content) {
        return null;
    }

    const layerMigrationData = getLayerMigrationData(content);
    if (!layerMigrationData) {
        return { baseContentKey: contentId, baseRepoId: repoId };
    }

    const { ts: migratedTimestamp, targetReferenceType } = layerMigrationData;
    if (targetReferenceType !== 'archived' || requestedTimestamp > migratedTimestamp) {
        return { baseContentKey: contentId, baseRepoId: repoId };
    }

    const { contentId: targetContentId, repoId: targetRepoId } = layerMigrationData;

    const targetContent = getRepoConnection({
        branch: 'draft',
        repoId: targetRepoId,
        asAdmin: true,
    }).get({
        key: targetContentId,
    });
    if (!targetContent) {
        logger.error(
            `Content not found for ${targetContentId} ${targetRepoId} - Returning live content for ${contentId} ${repoId}`
        );
        return { baseContentKey: contentId, baseRepoId: repoId };
    }

    return { baseContentKey: targetContentId, baseRepoId: targetRepoId };
};

// Get content from a specific datetime (used for requests from the internal version history selector)
export const getContentVersionFromDateTime = ({
    liveContentId,
    liveLocale,
    branch,
    requestedDateTime,
}: {
    liveContentId: string;
    liveLocale: string;
    branch: RepoBranch;
    requestedDateTime: string;
}): Content | null => {
    const repoId = getLayersData().localeToRepoIdMap[liveLocale];
    if (!repoId) {
        logger.error(`No layer repo found for locale ${liveLocale}`);
        return null;
    }

    const baseContentData = getBaseContentDataForRequestedTime(
        liveContentId,
        repoId,
        requestedDateTime
    );
    if (!baseContentData) {
        logger.info(`No content found for ${liveContentId} in repo ${repoId}`);
        return null;
    }

    const { baseContentKey, baseRepoId } = baseContentData;

    try {
        return runInTimeTravelContext(
            { dateTime: requestedDateTime, branch, baseContentKey, repoId: baseRepoId },
            () => {
                const contentFromDateTime = runInContext({ branch: 'draft' }, () =>
                    contentLib.get({ key: baseContentKey })
                );
                if (!contentFromDateTime) {
                    logger.info(
                        `No content found for requested timestamp - ${baseContentKey} in repo ${baseRepoId} (time: ${requestedDateTime})`
                    );
                    return null;
                }

                const content = runSitecontentGuillotineQuery(contentFromDateTime, 'draft');
                if (!content) {
                    logger.info(
                        `No content resolved through Guillotine for requested timestamp - ${baseContentKey} in repo ${baseRepoId} (time: ${requestedDateTime})`
                    );
                    return null;
                }

                return {
                    ...content,
                    liveId: liveContentId,
                    liveLocale: liveLocale,
                };
            }
        );
    } catch (e) {
        logger.error(`Time travel: Error retrieving data from version history: ${e}`);
        return null;
    }
};

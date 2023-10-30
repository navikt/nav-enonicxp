import * as contentLib from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInContext } from '../context/run-in-context';
import { runInTimeTravelContext } from './run-with-time-travel';
import { runSitecontentGuillotineQuery } from '../guillotine/queries/run-sitecontent-query';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { SitecontentResponse } from '../../services/sitecontent/common/content-response';
import { getLayersMigrationArchivedContentRef } from './layers-migration-refs';
import { getLayerMigrationData } from '../localization/layers-migration/migration-data';

const getArchivedContentRef = (contentId: string, repoId: string, requestedTimestamp: string) => {
    const archivedContentRef = getLayersMigrationArchivedContentRef({
        contentId,
        repoId,
    });
    if (!archivedContentRef) {
        return null;
    }

    const { archivedContentId, archivedRepoId } = archivedContentRef;

    const archivedContent = getRepoConnection({ branch: 'draft', repoId: archivedRepoId }).get(
        archivedContentId
    );
    if (!archivedContent) {
        logger.error(`Content not found for ${contentId} / ${repoId}`);
        return null;
    }

    const layersMigrationData = getLayerMigrationData(archivedContent);
    if (!layersMigrationData) {
        logger.error(`Layers migration data not found for ${contentId} / ${repoId}`);
        return null;
    }

    if (requestedTimestamp > layersMigrationData.ts) {
        return null;
    }

    return { baseContentId: archivedContentId, baseRepoId: archivedRepoId };
};

// If the content contains a reference to another archived/migrated content, and the requested
// timestamp matches a time prior to the migration, we try to retrieve the pre-migration content
// rather than the current live content
const getBaseContentRefForRequestedDateTime = (
    contentId: string,
    repoId: string,
    requestedTimestamp: string
): { baseContentId: string; baseRepoId: string } | null => {
    const content = getRepoConnection({ branch: 'draft', repoId, asAdmin: true }).get({
        key: contentId,
    });
    if (!content) {
        return null;
    }

    return (
        getArchivedContentRef(contentId, repoId, requestedTimestamp) || {
            baseContentId: contentId,
            baseRepoId: repoId,
        }
    );
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
}): SitecontentResponse => {
    const repoId = getLayersData().localeToRepoIdMap[liveLocale];
    if (!repoId) {
        logger.error(`No layer repo found for locale ${liveLocale}`);
        return null;
    }

    const baseContentRef = getBaseContentRefForRequestedDateTime(
        liveContentId,
        repoId,
        requestedDateTime
    );
    if (!baseContentRef) {
        logger.error(`No content found for ${liveContentId} in repo ${repoId}`);
        return null;
    }

    const { baseContentId, baseRepoId } = baseContentRef;

    try {
        return runInTimeTravelContext(
            {
                dateTime: requestedDateTime,
                branch,
                baseContentKey: baseContentId,
                repoId: baseRepoId,
            },
            () => {
                const contentFromDateTime = runInContext({ branch: 'draft' }, () =>
                    contentLib.get({ key: baseContentId })
                );
                if (!contentFromDateTime) {
                    logger.info(
                        `No content found for requested timestamp - ${baseContentId} in repo ${baseRepoId} (time: ${requestedDateTime})`
                    );
                    return null;
                }

                const content = runSitecontentGuillotineQuery(contentFromDateTime, 'draft');
                if (!content) {
                    logger.info(
                        `No content resolved through Guillotine for requested timestamp - ${baseContentId} in repo ${baseRepoId} (time: ${requestedDateTime})`
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
        logger.error(`Error retrieving data from version history: ${e}`);
        return null;
    }
};

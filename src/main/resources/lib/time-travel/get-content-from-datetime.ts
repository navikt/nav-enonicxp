import * as contentLib from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInContext } from '../context/run-in-context';
import { runInTimeTravelContext } from './run-with-time-travel';
import { runSitecontentGuillotineQuery } from '../guillotine/queries/run-sitecontent-query';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { getLayerMigrationData } from '../localization/layers-migration/migration-data';
import { SitecontentResponse } from '../../services/sitecontent/common/content-response';
import { CONTENT_ROOT_REPO_ID } from '../constants';

const getArchivedContentRef = (contentId: string, repoId: string, requestedTs: string) => {
    const rootRepo = getRepoConnection({
        branch: 'draft',
        repoId: CONTENT_ROOT_REPO_ID,
        asAdmin: true,
    });

    const result = rootRepo.query({
        count: 2,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data._layerMigration.contentId',
                            values: [contentId],
                        },
                    },
                    {
                        hasValue: {
                            field: 'data._layerMigration.repoId',
                            values: [repoId],
                        },
                    },
                    {
                        hasValue: {
                            field: 'data._layerMigration.targetReferenceType',
                            values: ['live'],
                        },
                    },
                ],
            },
        },
    }).hits;

    if (result.length === 0) {
        return null;
    }

    if (result.length > 1) {
        logger.critical(`Multiple archived content found for ${contentId} / ${repoId}`);
        return null;
    }

    const content = rootRepo.get(result[0].id);
    if (!content) {
        logger.error(`Content not found for ${contentId} / ${repoId}`);
        return null;
    }

    const layersMigrationData = getLayerMigrationData(content);
    if (!layersMigrationData) {
        logger.error(`Layers migration data not found for ${contentId} / ${repoId}`);
        return null;
    }

    if (requestedTs > layersMigrationData.ts) {
        return null;
    }

    return { archivedContentId: content._id, archivedRepoId: CONTENT_ROOT_REPO_ID };
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

    const archivedContentRef = getArchivedContentRef(contentId, repoId, requestedTimestamp);
    if (!archivedContentRef) {
        return { baseContentId: contentId, baseRepoId: repoId };
    }

    const { archivedContentId, archivedRepoId } = archivedContentRef;

    const targetContent = getRepoConnection({
        branch: 'draft',
        repoId: archivedRepoId,
        asAdmin: true,
    }).get({
        key: archivedContentId,
    });

    if (!targetContent) {
        logger.error(
            `Content not found for ${archivedContentId} ${archivedRepoId} - Returning live content for ${contentId} ${repoId}`
        );
        return { baseContentId: contentId, baseRepoId: repoId };
    }

    return { baseContentId: archivedContentId, baseRepoId: archivedRepoId };
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

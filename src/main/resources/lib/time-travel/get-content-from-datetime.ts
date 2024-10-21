import * as contentLib from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInContext } from '../context/run-in-context';
import { runInTimeTravelContext } from './run-with-time-travel';
import { runSitecontentGuillotineQuery } from '../guillotine/queries/run-sitecontent-query';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../repos/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { SitecontentResponse } from '../../services/sitecontent/common/content-response';
import { getLayersMigrationArchivedContentRef } from './layers-migration-refs';

type BaseContentRef = { baseContentId: string; baseRepoId: string };

// This refers to content which were previously in the default project, and was later migrated to
// a language-specific layer. The original default-project content was then archived, with a
// reference saved to the new content object in the language layer
const getArchivedContentRef = (
    contentId: string,
    repoId: string,
    requestedTimestamp: string
): BaseContentRef | null => {
    const archivedContentRef = getLayersMigrationArchivedContentRef({
        contentId,
        repoId,
    });
    if (!archivedContentRef) {
        return null;
    }

    const { archivedContentId, archivedRepoId, migrationTs } = archivedContentRef;

    if (requestedTimestamp > migrationTs) {
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
): BaseContentRef | null => {
    const content = getRepoConnection({ branch: 'draft', repoId, asAdmin: true }).get({
        key: contentId,
    });
    if (!content) {
        return null;
    }

    const archivedRef = getArchivedContentRef(contentId, repoId, requestedTimestamp);
    if (archivedRef) {
        return archivedRef;
    }

    return {
        baseContentId: contentId,
        baseRepoId: repoId,
    };
};

// Get content from a specific datetime (used for requests from the internal version history selector)
export const sitecontentVersionResolver = ({
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

import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInContext } from '../context/run-in-context';
import { runInTimeTravelContext } from './run-with-time-travel';
import { runSitecontentGuillotineQuery } from '../guillotine/queries/run-sitecontent-query';
import { getNodeVersions, getPublishedVersionTimestamps } from '../utils/version-utils';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { forceArray } from '../utils/array-utils';
import { CustomContentDescriptor } from '../../types/content-types/content-config';

// Get content from a specific datetime (used for requests from the internal version history selector)
export const getContentVersionFromDateTime = (
    contentRef: string,
    branch: RepoBranch,
    dateTime: string
): Content | null => {
    const repoConnection = getRepoConnection({ repoId: CONTENT_ROOT_REPO_ID, branch });

    const contentCurrent = repoConnection.get(contentRef);

    if (!contentCurrent) {
        logger.info(`Not found - ${contentRef}`);
        return null;
    }

    try {
        return runInTimeTravelContext({ dateTime, branch, baseContentKey: contentRef }, () => {
            const contentFromDateTime = runInContext({ branch: 'draft' }, () =>
                contentLib.get({ key: contentRef })
            );
            if (!contentFromDateTime) {
                logger.info(`Not found 2 - ${contentRef} ${dateTime}`);
                return null;
            }

            const content = runSitecontentGuillotineQuery(contentFromDateTime, 'draft');
            if (!content) {
                logger.info(
                    `Not found 3 - ${contentRef} ${dateTime} ${JSON.stringify(contentFromDateTime)}`
                );
                return null;
            }

            return {
                ...content,
                versionTimestamps: getPublishedVersionTimestamps(content._id),
                livePath: contentCurrent._path,
            };
        });
    } catch (e) {
        logger.error(`Time travel: Error retrieving data from version history: ${e}`);
        return null;
    }
};

const getPageTemplate = (content: Content) => {
    const templates = contentLib.getChildren({ key: '/www.nav.no/_templates', count: 1000 }).hits;

    return templates.find((template) => {
        if (template.type !== 'portal:page-template') {
            return false;
        }

        return forceArray(template.data.supports).includes(content.type as CustomContentDescriptor);
    });
};

export const getMostRecentLiveContent = (contentId: string, repoId: string) => {
    const repoConnection = getRepoConnection({ branch: 'draft', repoId });
    const contentNode = repoConnection.get(contentId);

    if (!contentNode) {
        logger.info(`Content not found - ${contentId} in repo ${repoId}`);
        return null;
    }

    const mostRecentLiveVersion = getNodeVersions({
        nodeKey: contentNode._id,
        branch: 'draft',
        repoId,
    }).find((version) => version.nodePath.startsWith('/content'));

    if (!mostRecentLiveVersion) {
        logger.info(`Could not determine last known live version - ${contentId} in repo ${repoId}`);
        return null;
    }

    logger.info(`Content props: ${JSON.stringify(mostRecentLiveVersion)}`);

    const mostRecentLiveContent = contentLib.get({
        key: mostRecentLiveVersion.nodeId,
        versionId: mostRecentLiveVersion.versionId,
    });
    if (!mostRecentLiveContent) {
        logger.info(
            `Could not retrieve last known live content - ${JSON.stringify(
                mostRecentLiveVersion
            )} in repo ${repoId}`
        );
        return null;
    }

    return runInTimeTravelContext(
        {
            dateTime: mostRecentLiveContent.modifiedTime,
            branch: 'draft',
            baseContentKey: mostRecentLiveVersion.nodeId,
        },
        () => {
            const content = runSitecontentGuillotineQuery(mostRecentLiveContent, 'draft');
            if (!content) {
                logger.info(`No result from guillotine query - ${contentId} in repo ${repoId}`);
                return null;
            }

            const page =
                content.page && Object.keys(content.page).length > 0
                    ? content.page
                    : getPageTemplate(content)?.page || {};

            return {
                ...content,
                page,
                versionTimestamps: getPublishedVersionTimestamps(content._id),
                livePath: mostRecentLiveContent._path,
            };
        }
    );
};

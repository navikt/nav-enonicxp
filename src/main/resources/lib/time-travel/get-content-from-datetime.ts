import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInContext } from '../context/run-in-context';
import { runInTimeTravelContext } from './run-with-time-travel';
import { runSitecontentGuillotineQuery } from '../guillotine/queries/run-sitecontent-query';
import { getPublishedVersionTimestamps } from '../utils/version-utils';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';

// Get content from a specific datetime (used for requests from the internal version history selector)
export const getContentVersionFromDateTime = (
    contentRef: string,
    branch: RepoBranch,
    dateTime: string,
    repoId = CONTENT_ROOT_REPO_ID
): Content | null => {
    const repoConnection = getRepoConnection({ repoId, branch });

    const activeContent = repoConnection.get(contentRef);
    if (!activeContent) {
        logger.info(`No active content found - ${contentRef} in repo ${repoId}`);
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
                livePath: activeContent._path,
            };
        });
    } catch (e) {
        logger.error(`Time travel: Error retrieving data from version history: ${e}`);
        return null;
    }
};

import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInContext } from '../context/run-in-context';
import { runInTimeTravelContext } from './run-with-time-travel';
import { runSitecontentGuillotineQuery } from '../guillotine/queries/run-sitecontent-query';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';

// Get content from a specific datetime (used for requests from the internal version history selector)
export const getContentVersionFromDateTime = ({
    contentRef,
    branch,
    time,
    locale,
}: {
    contentRef: string;
    branch: RepoBranch;
    time: string;
    locale: string;
}): Content | null => {
    const repoId = getLayersData().localeToRepoIdMap[locale];
    if (!repoId) {
        logger.error(`No layer repo found for locale ${locale}`);
        return null;
    }

    const repoConnection = getRepoConnection({ repoId, branch });

    const baseContent = repoConnection.get(contentRef);
    if (!baseContent) {
        logger.info(`No active content found - ${contentRef} in repo ${repoId}`);
        return null;
    }

    try {
        return runInTimeTravelContext(
            { dateTime: time, branch, baseContentKey: contentRef },
            () => {
                const contentFromDateTime = runInContext({ branch: 'draft' }, () =>
                    contentLib.get({ key: contentRef })
                );
                if (!contentFromDateTime) {
                    logger.info(
                        `No content found for requested timestamp - ${contentRef} in repo ${repoId} (time: ${time})`
                    );
                    return null;
                }

                const content = runSitecontentGuillotineQuery(contentFromDateTime, 'draft');
                if (!content) {
                    logger.info(
                        `No content resolved through Guillotine for requested timestamp - ${contentRef} in repo ${repoId} (time: ${time})`
                    );
                    return null;
                }

                return {
                    ...content,
                    livePath: baseContent._path,
                };
            }
        );
    } catch (e) {
        logger.error(`Time travel: Error retrieving data from version history: ${e}`);
        return null;
    }
};

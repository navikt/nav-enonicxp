import contentLib, { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInBranchContext } from '../utils/branch-context';
import { runWithTimeTravel } from './run-with-time-travel';
import { runSitecontentGuillotineQuery } from '../guillotine/queries/run-sitecontent-query';
import { getPublishedVersionTimestamps } from '../utils/version-utils';

// Get content from a specific datetime (used for requests from the internal version history selector)
export const getContentVersionFromDateTime = (
    contentRef: string,
    branch: RepoBranch,
    dateTime: string
): Content | null => {
    const contentCurrent = runInBranchContext(() => contentLib.get({ key: contentRef }), 'draft');
    if (!contentCurrent) {
        return null;
    }

    try {
        return runWithTimeTravel(dateTime, branch, contentRef, () => {
            const contentFromDateTime = runInBranchContext(
                () => contentLib.get({ key: contentRef }),
                'draft'
            );
            if (!contentFromDateTime) {
                return null;
            }

            const content = runSitecontentGuillotineQuery(contentFromDateTime, 'draft');
            if (!content) {
                return null;
            }

            const versionTimestamps = getPublishedVersionTimestamps(content._id, 'draft');

            return {
                ...content,
                versionTimestamps,
                livePath: contentCurrent._path,
            };
        });
    } catch (e) {
        log.warning(`Time travel: Error retrieving data from version history: ${e}`);
        return null;
    }
};

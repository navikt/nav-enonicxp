import { RepoBranch } from '../../types/common';
import { runInBranchContext } from '../utils/branch-context';
import { getUnixTimeFromDateTimeString, stringArrayToSet } from '../utils/nav-utils';
import { Content } from '/lib/xp/content';
import { timeTravelHooksEnabled } from './time-travel-hooks';
import { graphQlContentQueries } from '../guillotine/queries/run-content-query';
import { logger } from '../utils/logging';
import { contentLibGetStandard } from './standard-functions';

const contentTypesWithQuery = stringArrayToSet(Object.keys(graphQlContentQueries));

// Peace-of-mind checks to see if hooks for time-specific content retrieval is
// causing unexpected side effects. For normal requests (with no "time" parameter)
// the modifiedTime field for contents retrieved should be equal for hooked and
// standard functions
//
// Note: this has false negatives if the content is updated and then requested within
// a short period of time
export const validateTimestampConsistency = (
    contentRef: string,
    contentFromHookedLibs: Content | null,
    branch: RepoBranch
) => {
    if (!timeTravelHooksEnabled) {
        return true;
    }

    const contentRaw = runInBranchContext(() => contentLibGetStandard({ key: contentRef }), branch);

    // If neither content exists we're good
    if (!contentRaw && !contentFromHookedLibs) {
        return true;
    }

    if (!contentRaw) {
        logger.error(
            `Time travel consistency check could not complete, could not retrieve raw content for ${contentRef}`
        );
        return false;
    }

    if (!contentTypesWithQuery[contentRaw.type]) {
        return true;
    }

    if (!contentFromHookedLibs) {
        logger.error(
            `Time travel consistency check could not complete, found raw content but no content from hooked libs ${contentRef}`
        );
        return false;
    }

    const rawTime = contentRaw.modifiedTime;
    const hookedTime = contentFromHookedLibs.modifiedTime;

    const rawTimestamp = getUnixTimeFromDateTimeString(rawTime);
    const hookedTimestamp = getUnixTimeFromDateTimeString(hookedTime);

    if (rawTimestamp !== hookedTimestamp) {
        logger.error(
            `Time travel consistency check failed for ${contentRef} - got timestamp ${hookedTimestamp}, expected ${rawTimestamp}`
        );
        return false;
    }

    return true;
};

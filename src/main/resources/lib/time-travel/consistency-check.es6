const { timeTravelHooksEnabled } = require('/lib/time-travel/run-with-time-travel');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { contentLibGetOriginal } = require('/lib/time-travel/run-with-time-travel');
const { getUnixTimeFromDateTimeString } = require('/lib/nav-utils');

// Peace-of-mind checks to see if hooks for time-specific content retrieval is
// causing unexpected side-effects. Can be removed once peace of mind has been
// attained :D
//
// Note: this has false positives if the content is updated and requested within
// a short period of time
const validateTimestampConsistency = (contentRef, contentFromGuillotine, branch) => {
    if (!timeTravelHooksEnabled) {
        return true;
    }

    const contentRaw = runInBranchContext(() => contentLibGetOriginal({ key: contentRef }), branch);

    if (!contentRaw && !contentFromGuillotine) {
        return true;
    }

    if (!contentRaw) {
        log.error(
            `Time travel consistency check could not complete, could not retrieve raw content (this should not be possible!)`
        );
        return false;
    }

    const rawTime = contentRaw.modifiedTime;
    const guillotineTime = contentFromGuillotine.modifiedTime;

    const rawTimestamp = getUnixTimeFromDateTimeString(rawTime);
    const guillotineTimestamp = getUnixTimeFromDateTimeString(guillotineTime);

    if (rawTimestamp !== guillotineTimestamp) {
        log.error(
            `Time travel consistency check failed for ${contentRef} - got timestamp ${guillotineTimestamp}, expected ${rawTimestamp}`
        );
        return false;
    }

    return true;
};

module.exports = {
    validateTimestampConsistency,
};

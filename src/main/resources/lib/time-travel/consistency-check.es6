const {
    timeTravelHooksEnabled,
    contentLibGetStandard,
} = require('/lib/time-travel/run-with-time-travel');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { getUnixTimeFromDateTimeString } = require('/lib/nav-utils');

// Peace-of-mind checks to see if hooks for time-specific content retrieval is
// causing unexpected side-effects. For normal requests (with no "time" parameter)
// the modifiedTime field for contents retrieved should be equal for hooked and
// standard functions
//
// Can be removed once peace of mind has been attained :)
//
// Note: this has false negatives if the content is updated and then requested within
// a short period of time
const validateTimestampConsistency = (contentRef, contentFromHookedLibs, branch) => {
    if (!timeTravelHooksEnabled) {
        return true;
    }

    const contentRaw = runInBranchContext(() => contentLibGetStandard({ key: contentRef }), branch);

    // If neither content exists we're good
    if (!contentRaw && !contentFromHookedLibs) {
        return true;
    }

    // This should not be possible, but just in case...
    if (!contentRaw) {
        log.error(
            `Time travel consistency check could not complete, could not retrieve raw content for ${contentRef}`
        );
        return false;
    }

    const rawTime = contentRaw.modifiedTime;
    const hookedTime = contentFromHookedLibs.modifiedTime;

    const rawTimestamp = getUnixTimeFromDateTimeString(rawTime);
    const hookedTimestamp = getUnixTimeFromDateTimeString(hookedTime);

    if (rawTimestamp !== hookedTimestamp) {
        log.error(
            `Time travel consistency check failed for ${contentRef} - got timestamp ${hookedTimestamp}, expected ${rawTimestamp}`
        );
        return false;
    }

    return true;
};

module.exports = {
    validateTimestampConsistency,
};

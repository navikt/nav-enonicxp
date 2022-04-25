import { generateUUID } from '../utils/uuid';
import { RepoBranch } from '../../types/common';
import { timeTravelConfig } from './time-travel-config';
import { timeTravelHooksEnabled } from './time-travel-hooks';
import { getCurrentThreadId } from '../utils/nav-utils';

export const runWithTimeTravel = (
    requestedDateTime: string,
    branch: RepoBranch,
    baseContentKey: string,
    callback: () => any
) => {
    if (!timeTravelHooksEnabled) {
        log.error(
            `Time travel: got request for ${baseContentKey} but time travel is disabled on this node`
        );
        return callback();
    }

    const threadId = getCurrentThreadId();
    const sessionId = generateUUID();

    try {
        log.info(
            `Time travel: Starting session ${sessionId} - base content: ${baseContentKey} / time: ${requestedDateTime} / branch: ${branch} / thread: ${threadId}`
        );
        timeTravelConfig.add({
            threadId,
            requestedDateTime,
            branch,
            baseContentKey,
        });
        return callback();
    } catch (e) {
        log.info(`Time travel: Error occured during session ${sessionId} - ${e}`);
        throw e;
    } finally {
        timeTravelConfig.remove(threadId);
        log.info(`Time travel: Ending session ${sessionId} for thread ${threadId}`);
    }
};

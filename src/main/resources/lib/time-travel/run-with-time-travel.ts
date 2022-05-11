import { generateUUID } from '../utils/uuid';
import { RepoBranch } from '../../types/common';
import { timeTravelConfig } from './time-travel-config';
import { timeTravelHooksEnabled } from './time-travel-hooks';
import { getCurrentThreadId } from '../utils/nav-utils';
import { logger } from '../utils/logging';

export const runWithTimeTravel = (
    requestedDateTime: string,
    branch: RepoBranch,
    baseContentKey: string,
    callback: () => any
) => {
    if (!timeTravelHooksEnabled) {
        logger.error(
            `Time travel: got request for ${baseContentKey} but time travel is disabled on this node`
        );
        return callback();
    }

    const threadId = getCurrentThreadId();
    const sessionId = generateUUID();

    try {
        logger.info(
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
        logger.error(`Time travel: Error occured during session ${sessionId} - ${e}`);
        throw e;
    } finally {
        timeTravelConfig.remove(threadId);
        logger.info(`Time travel: Ending session ${sessionId} for thread ${threadId}`);
    }
};

import * as contextLib from '/lib/xp/context';
import { generateUUID } from '../utils/uuid';
import { RepoBranch } from '../../types/common';
import { logger } from '../utils/logging';
import { getContextRepoId, runInContext } from '../context/run-in-context';
import { getTargetUnixTime } from '../utils/version-utils';
import { getUnixTimeFromDateTimeString } from '../utils/datetime-utils';
import { getContentNodeKey } from '../utils/content-utils';

// Time travel is disabled during the XP8 migration. It relied on hooking lib-content/lib-node in
// the lib-guillotine runtime, while Guillotine app 8 resolves built-in fields in Java where these
// hooks have no effect. Content is resolved to its current version while this is disabled.
export const TIME_TRAVEL_ENABLED = false;

type TimeTravelOptions = {
    dateTime: string;
    baseContentKey: string;
    branch: RepoBranch;
    repoId?: string;
};

type TimeTravelContextAttribs = {
    timeTravelTargetUnixTime: number;
    timeTravelBranch: RepoBranch;
    timeTravelRepoId: string;
    timeTravelBaseContentKey: string;
    timeTravelBaseNodeKey: string;
};

export const getTimeTravelContext = (): TimeTravelContextAttribs | null => {
    const attribs = contextLib.get()?.attributes as Partial<TimeTravelContextAttribs>;
    if (!attribs) {
        return null;
    }

    const {
        timeTravelTargetUnixTime,
        timeTravelBranch,
        timeTravelBaseContentKey,
        timeTravelRepoId,
        timeTravelBaseNodeKey,
    } = attribs;

    if (
        !timeTravelTargetUnixTime ||
        !timeTravelBranch ||
        !timeTravelBaseContentKey ||
        !timeTravelRepoId ||
        !timeTravelBaseNodeKey
    ) {
        return null;
    }

    return {
        timeTravelRepoId,
        timeTravelBranch,
        timeTravelBaseNodeKey,
        timeTravelBaseContentKey,
        timeTravelTargetUnixTime,
    };
};

export const runInTimeTravelContext = <CallbackReturn>(
    options: TimeTravelOptions,
    callback: () => CallbackReturn
) => {
    const { branch, baseContentKey, dateTime, repoId = getContextRepoId() } = options;

    if (!TIME_TRAVEL_ENABLED) {
        logger.info(
            `Time travel is disabled - resolving current version for ${baseContentKey} (requested time: ${dateTime} / repo: ${repoId})`
        );
        return runInContext({ repository: repoId, asAdmin: true }, callback);
    }

    const sessionId = generateUUID();

    const baseNodeKey = getContentNodeKey(baseContentKey);
    const requestedUnixTime = getUnixTimeFromDateTimeString(dateTime);

    const targetUnixTime = getTargetUnixTime({
        nodeKey: baseNodeKey,
        requestedUnixTime,
        repoId,
        branch,
    });

    logger.info(
        `Time travel: Running session ${sessionId} - base content: ${baseContentKey} / time: ${dateTime} / branch: ${branch} / repo: ${repoId}`
    );

    const attribs: TimeTravelContextAttribs = {
        timeTravelBranch: branch,
        timeTravelRepoId: repoId,
        timeTravelTargetUnixTime: targetUnixTime,
        timeTravelBaseContentKey: baseContentKey,
        timeTravelBaseNodeKey: baseNodeKey,
    };

    const result = runInContext(
        {
            repository: repoId,
            attributes: attribs,
            asAdmin: true,
        },
        callback
    );

    logger.info(`Time travel: Finished session ${sessionId}`);

    return result;
};

import * as contextLib from '/lib/xp/context';
import { generateUUID } from '../utils/uuid';
import { RepoBranch } from '../../types/common';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { getNodeKey, getTargetUnixTime } from '../utils/version-utils';
import { getUnixTimeFromDateTimeString } from '../utils/datetime-utils';

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
    const { branch, baseContentKey, dateTime, repoId = contextLib.get().repository } = options;

    const sessionId = generateUUID();

    const baseNodeKey = getNodeKey(baseContentKey);
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
        },
        callback
    );

    logger.info(`Time travel: Finished session ${sessionId}`);

    return result;
};

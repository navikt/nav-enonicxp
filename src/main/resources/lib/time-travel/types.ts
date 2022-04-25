import { RepoConnection } from '/lib/xp/node';
import { RepoBranch } from '../../types/common';

type ConfigEntry = {
    repo: RepoConnection;
    branch: RepoBranch;
    baseNodeKey: string;
    baseContentKey: string;
    targetUnixTime: number;
};

export type TimeTravelConfig = {
    configs: { [threadId: string]: ConfigEntry };
    add: ({
        threadId,
        requestedDateTime,
        branch,
        baseContentKey,
    }: {
        threadId: number;
        requestedDateTime: string;
        branch: RepoBranch;
        baseContentKey: string;
    }) => void;
    get: (threadId: number) => ConfigEntry | undefined;
    remove: (threadId: number) => void;
    clear: () => void;
};

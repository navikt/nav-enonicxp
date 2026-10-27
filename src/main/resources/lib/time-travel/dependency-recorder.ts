import * as contextLib from '/lib/xp/context';
import { NodeVersion } from '/lib/xp/node';
import { runInContext } from '../context/run-in-context';
import { generateUUID } from '../utils/uuid';

// TEMPORARY - part of the archive experiment on the archive-dependency-stats branch, used by
// services/archiveDependencyTrace. Remove with the branch.
//
// Records what the time travel hooks fetch while a callback runs. The recording id reaches the
// hooks as a context attribute, the same way time travel passes on the requested time. Fetches
// outside runWithFetchRecording are not recorded, so other requests are not affected.
//
// The recordings are kept in this module, which is shared by all requests. Fine for one manual
// call at a time, which is how the experiment is used.

const RECORDING_ID_ATTRIBUTE = 'timeTravelRecordingId';

export type RecordedFetch = {
    via: 'contentLib.get' | 'repo.get';
    // The key the content was requested with, an id or a path
    nodeKey: string;
    // The repo time travel looked in
    repoId: string;
    // The version time travel picked. Empty if the content did not exist or was not published yet
    version?: (NodeVersion & { repoId: string }) | null;
};

const recordings: Record<string, RecordedFetch[]> = {};

export const recordTimeTravelFetch = (fetch: RecordedFetch) => {
    const recordingId = contextLib.get().attributes?.[RECORDING_ID_ATTRIBUTE];
    if (typeof recordingId !== 'string') {
        return;
    }

    recordings[recordingId]?.push(fetch);
};

export const runWithFetchRecording = <Result>(callback: () => Result) => {
    const recordingId = generateUUID();
    const fetches: RecordedFetch[] = [];
    recordings[recordingId] = fetches;

    try {
        const result = runInContext(
            { asCurrentUser: true, attributes: { [RECORDING_ID_ATTRIBUTE]: recordingId } },
            callback
        );

        return { result, fetches };
    } finally {
        delete recordings[recordingId];
    }
};

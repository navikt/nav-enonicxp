/*
 * WARNING:
 *
 * The function hooks in this file alters content retrieval functions, adding the option to get content from
 * a certain timestamp, with all references also correctly resolved to this timestamp. This "time travel"
 * functionality should only be enabled for threads spawned from requests where the "time" parameter to the
 * sitecontent service was set. All other requests should get standard functionality.
 *
 * This is a very scary hack which can result in outdated content being served if proper cleanup is not done
 * after every "time travel"-requesting thread. Keep in mind thread-ids are reused and the http-server is
 * multithreaded. Make sure you understand what you're doing if you make any changes. :)
 *
 * */

import contentLib from '/lib/xp/content';
import nodeLib, { RepoConnection } from '/lib/xp/node';
import { getNodeKey, getVersionFromTime } from '../utils/version-utils';
import { runInBranchContext } from '../utils/branch-context';
import { getCurrentThreadId } from '../utils/nav-utils';
import { TimeTravelConfig } from './types';

export let timeTravelHooksEnabled = false;

export const contentLibGetStandard = contentLib.get;
export const nodeLibConnectStandard = nodeLib.connect;

// This function will hook content retrieval functions to retrieve data from
// the version at the requested timestamp. Only calls from threads currently
// registered with a time travel config will be affected.
export const hookLibsWithTimeTravel = (timeTravelConfig: TimeTravelConfig) => {
    if (timeTravelHooksEnabled) {
        log.error(`Time travel hooks are already enabled!`);
        return;
    }

    timeTravelHooksEnabled = true;

    contentLib.get = function (args) {
        const threadId = getCurrentThreadId();
        const configForThread = timeTravelConfig.get(threadId);

        // If the function is called while hooked, only threads with time travel parameters set
        // should get non-standard functionality
        if (!configForThread) {
            return contentLibGetStandard(args);
        }

        const key = args?.key;

        // If the key is not defined, use standard functionality for error handling
        if (!key) {
            return contentLibGetStandard(args);
        }

        const { repo, branch, baseContentKey, targetUnixTime } = configForThread;

        const requestedVersion = getVersionFromTime({
            nodeKey: getNodeKey(key),
            repo,
            branch,
            unixTime: targetUnixTime,
            getOldestIfNotFound: key === baseContentKey,
        });

        if (!requestedVersion) {
            return null;
        }

        // If a content node version from the requested time was found, retrieve this
        // content with standard functionality
        return runInBranchContext(
            () =>
                contentLibGetStandard({
                    key: requestedVersion.nodeId,
                    versionId: requestedVersion.versionId,
                }),
            'draft'
        );
    };

    nodeLib.connect = function (connectArgs) {
        const threadId = getCurrentThreadId();
        const configForThread = timeTravelConfig.get(threadId);

        // If the function is called while hooked, only threads with time travel parameters set
        // should get non-standard functionality
        if (!configForThread) {
            return nodeLibConnectStandard(connectArgs);
        }

        const { branch, targetUnixTime, baseNodeKey } = configForThread;

        const repoConnection = nodeLibConnectStandard(connectArgs);
        const repoGet = repoConnection.get.bind(repoConnection);

        // repo.get args can be a single key, or an array of keys, or an object
        // (or array of objects) with the shape { key: <id or path> }
        const getNodeKeysFromArgs = (args: Parameters<RepoConnection['get']>[0]): any => {
            if (typeof args === 'string') {
                return args;
            }

            if (Array.isArray(args)) {
                return args.map(getNodeKeysFromArgs);
            }

            if (args && typeof args === 'object') {
                return getNodeKeysFromArgs(args.key);
            }

            return null;
        };

        const getNode = (nodeKey: string) => {
            const requestedVersion = getVersionFromTime({
                nodeKey,
                repo: repoConnection,
                branch,
                unixTime: targetUnixTime,
                getOldestIfNotFound: nodeKey === baseNodeKey,
            });

            if (!requestedVersion) {
                return null;
            }

            // Templates should always resolve to the active version, to avoid inconsistent
            // component structures
            if (requestedVersion.nodePath.startsWith('/content/www.nav.no/_templates')) {
                return repoGet(nodeKey);
            }

            return repoGet({
                key: requestedVersion.nodeId,
                versionId: requestedVersion.versionId,
            });
        };

        repoConnection.get = function (getArgs) {
            const nodeKeys = getNodeKeysFromArgs(getArgs);
            if (!nodeKeys) {
                return null;
            }

            if (Array.isArray(nodeKeys)) {
                return nodeKeys.map(getNode);
            }

            return getNode(nodeKeys);
        };

        return repoConnection;
    };
};

// Restore standard functionality
export const unhookTimeTravel = () => {
    timeTravelHooksEnabled = false;
    contentLib.get = contentLibGetStandard;
    nodeLib.connect = nodeLibConnectStandard;
};

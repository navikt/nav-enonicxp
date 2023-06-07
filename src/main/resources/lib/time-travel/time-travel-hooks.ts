/*
 * Monkey-patch hacks for content retrieval functions, adding the option to get content from a certain timestamp,
 * with all references also correctly resolved to this timestamp.
 *
 * */

import * as contentLib from '/lib/xp/content';
import * as nodeLib from '/lib/xp/node';
import { RepoConnection } from '/lib/xp/node';
import { getNodeKey, getVersionFromTime } from '../utils/version-utils';
import { runInContext } from '../context/run-in-context';
import { logger } from '../utils/logging';
import { contentLibGetStandard, nodeLibConnectStandard } from './standard-functions';
import { getTimeTravelContext } from './run-with-time-travel';

export let timeTravelHooksEnabled = false;

// This function will hook content retrieval functions to retrieve data from
// the version at the requested timestamp. Only calls from threads currently
// registered with a time travel config will be affected.
export const hookLibsWithTimeTravel = () => {
    if (timeTravelHooksEnabled) {
        logger.error(`Time travel hooks are already enabled!`);
        return;
    }

    timeTravelHooksEnabled = true;

    (contentLib.get as typeof contentLibGetStandard) = function (args) {
        const timeTravelContext = getTimeTravelContext();

        // If the function is called while hooked, only threads with time travel parameters set
        // should get non-standard functionality
        if (!timeTravelContext) {
            // Catch errors here as a temp fix for contentLib.get throwing errors when attempting
            // to get a content which has been archived
            try {
                return contentLibGetStandard(args);
            } catch (e) {
                logger.warning(
                    `Error from contentLib.get - args: ${JSON.stringify(args)} - error: ${e}`
                );
                return null;
            }
        }

        const key = args?.key;

        // If the key is not defined, use standard functionality for error handling
        if (!key) {
            return contentLibGetStandard(args);
        }

        const {
            timeTravelTargetUnixTime,
            timeTravelRepoId,
            timeTravelBranch,
            timeTravelBaseContentKey,
        } = timeTravelContext;

        const requestedVersion = getVersionFromTime({
            nodeKey: getNodeKey(key),
            repoId: timeTravelRepoId,
            branch: timeTravelBranch,
            unixTime: timeTravelTargetUnixTime,
            getOldestIfNotFound: key === timeTravelBaseContentKey,
        });

        if (!requestedVersion) {
            return null;
        }

        // If a content node version from the requested time was found, retrieve this
        // content with standard functionality
        return runInContext({ branch: 'draft' }, () =>
            contentLibGetStandard({
                key: requestedVersion.nodeId,
                versionId: requestedVersion.versionId,
            })
        );
    };

    (nodeLib.connect as typeof nodeLibConnectStandard) = function (connectArgs) {
        const timeTravelContext = getTimeTravelContext();

        // If the function is called while hooked, only threads with time travel parameters set
        // should get non-standard functionality
        if (!timeTravelContext) {
            return nodeLibConnectStandard(connectArgs);
        }

        const {
            timeTravelTargetUnixTime,
            timeTravelRepoId,
            timeTravelBranch,
            timeTravelBaseNodeKey,
        } = timeTravelContext;

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
                repoId: timeTravelRepoId,
                branch: timeTravelBranch,
                unixTime: timeTravelTargetUnixTime,
                getOldestIfNotFound: nodeKey === timeTravelBaseNodeKey,
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

    (contentLib.get as typeof contentLibGetStandard) = contentLibGetStandard;
    (nodeLib.connect as typeof nodeLibConnectStandard) = nodeLibConnectStandard;
};

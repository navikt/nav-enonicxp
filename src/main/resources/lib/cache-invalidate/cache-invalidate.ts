import eventLib, { EnonicEvent } from '/lib/xp/event';
import nodeLib from '/lib/xp/node';
import {
    frontendCacheInvalidatePaths,
    frontendCacheWipeAll,
} from '../headless/frontend-cache-invalidate';
import { getNodeVersions } from '../time-travel/version-utils';
import { runInBranchContext } from '../utils/branch-context';
import { handleScheduledPublish } from './scheduled-publish';
import { contentRepo } from '../constants';
import { PrepublishCacheWipeConfig } from '../../tasks/prepublish-cache-wipe/prepublish-cache-wipe-config';
import { addReliableEventListener } from '../events/reliable-custom-events';
import { findReferences } from './find-references';
import { wipeSiteinfoCache } from '../controllers/site-info';

export type NodeEventData = {
    id: string;
    path: string;
    branch: string;
    repo: string;
};

export const cacheInvalidateEventName = 'invalidate-cache';
export const prepublishInvalidateEvent = 'prepublish-invalidate';

// Define site path as a literal, because portal.getSite() can't be called from main.js
const sitePath = '/www.nav.no/';
const redirectPath = '/redirects/';

// Matches [/content]/www.nav.no/* and [/content]/redirects/*
const pathnameFilter = new RegExp(`^(/content)?(${redirectPath}|${sitePath})`);

const getPathname = (path: string) => path.replace(pathnameFilter, '/');

const generateCacheEventId = (nodeData: NodeEventData, timestamp: number) =>
    `${nodeData.id}-${timestamp}`;

const shouldWipeAll = (nodePath: string) => {
    if (nodePath.includes('/_templates/')) {
        log.info('Clearing whole cache due to updated template');
        return true;
    }

    if (nodePath.includes('/global-notifications/')) {
        log.info('Clearing whole cache due to updated global notification');
        return true;
    }

    return false;
};

const getPreviousIfPathChanged = (node: NodeEventData) => {
    const repo = nodeLib.connect({
        repoId: node.repo || contentRepo,
        branch: 'master',
    });

    const previousVersion = getNodeVersions({ nodeKey: node.id, repo, branch: 'master' })?.[1];

    if (previousVersion) {
        const previousPath = getPathname(previousVersion.nodePath);
        const currentPath = getPathname(node.path);

        if (previousPath !== currentPath) {
            log.info(
                `Path changed for ${node.id}, wiping cache on old path - Previous path: ${previousPath} - New path: ${currentPath}`
            );
            return previousPath;
        }
    }

    return null;
};

export const wipeSitecontentEntryWithReferences = (
    node: NodeEventData,
    eventId: string,
    eventType?: string
) => {
    const { id, path } = node;

    const referencedPaths = findReferences({ id, eventType }).map((content) => content._path);

    const previousPath = getPreviousIfPathChanged(node);

    if (previousPath) {
        referencedPaths.push(previousPath);
    }

    log.info(
        `Clearing ${path} and ${referencedPaths.length} references for ${path}: ${JSON.stringify(
            referencedPaths,
            null,
            4
        )}`
    );

    frontendCacheInvalidatePaths([path, ...referencedPaths], eventId);
};

export const wipeCacheForNode = (node: NodeEventData, eventType: string, timestamp: number) => {
    const eventId = generateCacheEventId(node, timestamp);

    if (shouldWipeAll(node.path)) {
        frontendCacheWipeAll(eventId);
        return;
    }

    runInBranchContext(() => {
        wipeSitecontentEntryWithReferences(node, eventId, eventType);
    }, 'master');
};

const nodeListenerCallback = (event: EnonicEvent) => {
    event.data.nodes.forEach((node) => {
        if (node.branch === 'master' && node.repo === contentRepo) {
            const isPrepublished = handleScheduledPublish(node, event.type);

            if (!isPrepublished) {
                wipeCacheForNode(node, event.type, event.timestamp);
            }
        }
    });
    wipeSiteinfoCache();
};

const prepublishCallback = (event: EnonicEvent<PrepublishCacheWipeConfig>) => {
    log.info(`Clearing cache for prepublished content: ${event.data.path}`);
    wipeCacheForNode(
        { ...event.data, branch: 'master', repo: contentRepo },
        event.type,
        event.timestamp
    );
    wipeSiteinfoCache();
};

let hasSetupListeners = false;

export const activateCacheEventListeners = () => {
    if (!hasSetupListeners) {
        eventLib.listener({
            type: '(node.pushed|node.deleted)',
            localOnly: false,
            callback: nodeListenerCallback,
        });

        addReliableEventListener({
            type: prepublishInvalidateEvent,
            callback: prepublishCallback,
        });

        addReliableEventListener<NodeEventData>({
            type: cacheInvalidateEventName,
            callback: (event) => {
                const { id, path, eventId } = event.data;
                log.info(`Received event for cache invalidating of ${path} - ${id}`);
                runInBranchContext(
                    () => wipeSitecontentEntryWithReferences(event.data, eventId),
                    'master'
                );
            },
        });

        log.info('Started: Cache eventListener on node events');
        hasSetupListeners = true;
    } else {
        log.warning('Cache node listeners already running');
    }
};

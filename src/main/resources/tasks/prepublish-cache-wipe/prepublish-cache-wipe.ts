import { PrepublishCacheWipeConfig } from './prepublish-cache-wipe-config';
import { invalidateCacheForNode } from '../../lib/cache/cache-invalidate';
import { CONTENT_ROOT_REPO_ID } from '../../lib/constants';
import { logger } from '../../lib/utils/logging';

export const run = (params: PrepublishCacheWipeConfig) => {
    const { id, path } = params;
    logger.info(`Running task for cache invalidation of prepublished content - ${id} - ${path}`);

    invalidateCacheForNode({
        node: { id, path, branch: 'master', repo: CONTENT_ROOT_REPO_ID },
        eventType: 'node.pushed',
        timestamp: Date.now(),
        isRunningClusterWide: false,
    });
};

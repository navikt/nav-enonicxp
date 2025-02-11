import { invalidateCacheForNode } from '../../lib/cache/cache-invalidate';
import { logger } from '../../lib/utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../../lib/constants';
import { PrepublishCacheWipe } from '@xp-types/tasks/prepublish-cache-wipe';
import { updateExternalSearchDocumentForContent } from '../../lib/search/update-one';

export const run = (params: PrepublishCacheWipe) => {
    const { id, path, repoId = CONTENT_ROOT_REPO_ID } = params;
    logger.info(
        `Running task for cache invalidation of prepublished content - ${id} - ${repoId} - ${path}`
    );

    invalidateCacheForNode({
        node: { id, path, branch: 'main', repo: repoId },
        eventType: 'node.pushed',
        timestamp: Date.now(),
        isRunningClusterWide: false,
    });

    updateExternalSearchDocumentForContent(id, repoId);
};

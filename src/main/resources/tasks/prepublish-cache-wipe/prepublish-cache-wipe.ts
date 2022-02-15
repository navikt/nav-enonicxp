import { PrepublishCacheWipeConfig } from './prepublish-cache-wipe-config';
import { wipeCacheForNode } from '../../lib/siteCache';
import { contentRepo } from '../../lib/constants';

export const run = ({ path, id, timestamp, eventType }: PrepublishCacheWipeConfig) => {
    log.info(`Running task for prepublish cache wipe - ${id}`);

    wipeCacheForNode(
        {
            path,
            id,
            repo: contentRepo,
            branch: 'master',
        },
        eventType,
        timestamp
    );
};

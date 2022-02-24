import nodeLib from '/lib/xp/node';
import { UnpublishExpiredContentConfig } from './unpublish-expired-content-config';
import { scheduleUnpublish } from '../../lib/siteCache/scheduled-publish';
import { contentRepo } from '../../lib/constants';

export const run = (params: UnpublishExpiredContentConfig) => {
    const { id, path } = params;

    log.info(`Running task for unpublishing expired content - ${id} - ${path}`);

    const repo = nodeLib.connect({ repoId: contentRepo, branch: 'master' });
    const content = repo.get({ key: id });
    if (!content) {
        log.info(`Content ${id} not found in master - aborting unpublish task`);
        return;
    }

    const publishTo = content.publish?.to;
    if (!publishTo) {
        log.info(`Content ${id} is no longer set to expire - aborting unpublish task`);
        return;
    }

    const currentTime = Date.now();
    const publishToTime = new Date(publishTo).getTime();
    if (currentTime < publishToTime) {
        log.info(
            `Content ${id} has not yet expired - rescheduling unpublish task (current time: ${currentTime} - expire time: ${publishToTime})`
        );
        scheduleUnpublish({ id, path, publishTo });
        return;
    }

    try {
        const unpublished = repo.delete(id);
        if (unpublished) {
            log.info(`Unpublished content: ${unpublished.join(', ')}`);
        } else {
            log.error(`Could not unpublish ${id}`);
        }
    } catch (e) {
        log.error(`Error while unpublishing ${id} - ${e}`);
    }
};

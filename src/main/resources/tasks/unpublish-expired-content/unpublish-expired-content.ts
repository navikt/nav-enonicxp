import contentLib from '/lib/xp/content';
import nodeLib from '/lib/xp/node';
import { UnpublishExpiredContentConfig } from './unpublish-expired-content-config';
import { scheduleUnpublish } from '../../lib/scheduling/scheduled-publish';
import { contentRepo } from '../../lib/constants';
import { getUnixTimeFromDateTimeString } from '../../lib/utils/nav-utils';

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
    const publishToTime = getUnixTimeFromDateTimeString(publishTo);
    if (currentTime < publishToTime) {
        log.info(
            `Content ${id} has not yet expired - rescheduling unpublish task (current time: ${currentTime} - expire time: ${publishToTime})`
        );
        scheduleUnpublish({ id, path, publishTo });
        return;
    }

    try {
        const unpublished = contentLib.unpublish({ keys: [id] });
        if (unpublished && unpublished.length > 0) {
            log.info(`Unpublished content: ${unpublished.join(', ')}`);
            if (unpublished.length > 1) {
                log.warning(`Unexpectedly unpublished multiple contents with id ${id}`);
            }
        } else {
            log.error(`Could not unpublish ${id} - unknown error`);
        }
    } catch (e) {
        log.error(`Error while unpublishing ${id} - ${e}`);
    }
};

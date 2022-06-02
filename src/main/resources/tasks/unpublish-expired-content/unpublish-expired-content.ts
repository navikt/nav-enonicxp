import contentLib from '/lib/xp/content';
import nodeLib from '/lib/xp/node';
import { UnpublishExpiredContentConfig } from './unpublish-expired-content-config';
import { scheduleUnpublish } from '../../lib/scheduling/scheduled-publish';
import { contentRepo } from '../../lib/constants';
import { getUnixTimeFromDateTimeString } from '../../lib/utils/nav-utils';
import { logger } from '../../lib/utils/logging';

export const run = (params: UnpublishExpiredContentConfig) => {
    const { id, path } = params;

    logger.info(`Running task for unpublishing expired content - ${id} - ${path}`);

    const repo = nodeLib.connect({ repoId: contentRepo, branch: 'master' });
    const content = repo.get({ key: id });
    if (!content) {
        logger.error(`Content ${id} not found in master - aborting unpublish task`);
        return;
    }

    const publishTo = content.publish?.to;
    if (!publishTo) {
        logger.info(`Content ${id} is no longer set to expire - aborting unpublish task`);
        return;
    }

    const currentTime = Date.now();
    const publishToTime = getUnixTimeFromDateTimeString(publishTo);
    if (currentTime < publishToTime) {
        logger.info(
            `Content ${id} has not yet expired - rescheduling unpublish task (current time: ${currentTime} - expire time: ${publishToTime})`
        );
        scheduleUnpublish({ id, path, publishTo });
        return;
    }

    try {
        const unpublished = contentLib.unpublish({ keys: [id] });
        if (unpublished && unpublished.length > 0) {
            logger.info(`Unpublished content: ${unpublished.join(', ')}`);
            if (unpublished.length > 1) {
                logger.error(`Unexpectedly unpublished multiple contents with id ${id}`);
            }
        } else {
            const contentNow = repo.get({ key: id });
            if (contentNow) {
                logger.critical(`Could not unpublish ${id} - unknown error`);
            } else {
                logger.warning(
                    `Could not unpublish ${id} as it was already unpublished`
                );
            }
        }
    } catch (e) {
        logger.critical(`Error while unpublishing ${id} - ${e}`);
    }
};

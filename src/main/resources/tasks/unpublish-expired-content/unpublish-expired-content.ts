import * as contentLib from '/lib/xp/content';
import { getRepoConnection } from '../../lib/utils/repo-utils';
import { UnpublishExpiredContentConfig } from './unpublish-expired-content-config';
import { scheduleUnpublish } from '../../lib/scheduling/scheduled-publish';
import { logger } from '../../lib/utils/logging';
import { getLayersData } from '../../lib/localization/layers-data';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { CONTENT_ROOT_REPO_ID } from '../../lib/constants';
import { getUnixTimeFromDateTimeString } from '../../lib/utils/datetime-utils';

export const run = (params: UnpublishExpiredContentConfig) => {
    const { id, path, repoId = CONTENT_ROOT_REPO_ID } = params;

    logger.info(`Running task for unpublishing expired content - ${id} - ${path}`);

    const repo = getRepoConnection({ repoId, branch: 'master' });
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
        scheduleUnpublish({ id, path, repoId, publishTo });
        return;
    }

    try {
        const locale = getLayersData().repoIdToLocaleMap[repoId];
        const unpublished = runInLocaleContext({ locale }, () =>
            contentLib.unpublish({ keys: [id] })
        );
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
                logger.warning(`Could not unpublish ${id} as it was already unpublished`);
            }
        }
    } catch (e) {
        logger.critical(`Error while unpublishing ${id} - ${e}`);
    }
};

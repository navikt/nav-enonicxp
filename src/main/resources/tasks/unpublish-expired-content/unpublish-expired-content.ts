import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { scheduleUnpublish } from '../../lib/scheduling/scheduled-publish';
import { logger } from '../../lib/utils/logging';
import { getLayersData } from '../../lib/localization/layers-data';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { CONTENT_ROOT_REPO_ID } from '../../lib/constants';
import { UnpublishExpiredContent } from '@xp-types/tasks/unpublish-expired-content';
import { getRepoConnection } from '../../lib/utils/repo-utils';
import { deleteExternalSearchDocumentForContent } from '../../lib/search/update-one';
import { getNowWithoutMs } from '../../lib/utils/datetime-utils';

export const run = (params: UnpublishExpiredContent) => {
    const { id, path, repoId = CONTENT_ROOT_REPO_ID } = params;

    const contentInfo = `${id} [${repoId}]`;

    logger.info(`Running task for unpublishing expired content - ${contentInfo}`);

    const repo = getRepoConnection({ repoId, branch: 'master' });

    const content = repo.get<Content>({ key: id });
    if (!content) {
        logger.error(`Content ${contentInfo} not found in master - aborting unpublish task`);
        return;
    }

    const publishTo = content.publish?.to;
    if (!publishTo) {
        logger.info(`Content ${contentInfo} is no longer set to expire - aborting unpublish task`);
        return;
    }

    // Time comparison gives false positive if one has milliseconds.
    const now = getNowWithoutMs();
    if (now < publishTo) {
        logger.info(
            `Content ${contentInfo} has not yet expired - rescheduling unpublish task (current time: ${now} - expire time: ${publishTo})`
        );
        scheduleUnpublish({ id, path, repoId, publishTo });
        return;
    }

    try {
        const locale = getLayersData().repoIdToLocaleMap[repoId];
        const unpublished = runInLocaleContext({ locale, asAdmin: true }, () =>
            contentLib.unpublish({ keys: [id] })
        );
        if (unpublished && unpublished.length > 0) {
            // Make sure that content isn't searchable after unpublish.
            deleteExternalSearchDocumentForContent(id, repoId);
            logger.info(`Unpublished content: ${unpublished.join(', ')}`);
            if (unpublished.length > 1) {
                logger.error(`Unexpectedly unpublished multiple contents: ${contentInfo}`);
            }
        } else {
            const contentNow = repo.get<Content>({ key: id });
            if (contentNow) {
                logger.critical(`Could not unpublish ${contentInfo} - unknown error`);
            } else {
                logger.warning(`Could not unpublish ${contentInfo} as it was already unpublished`);
            }
        }
    } catch (e) {
        logger.critical(`Error while unpublishing ${contentInfo} - ${e}`);
    }
};

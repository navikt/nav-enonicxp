import { Request } from '@enonic-types/core';
import * as contentLib from '/lib/xp/content';
import * as eventLib from '/lib/xp/event';
import { CACHE_INVALIDATE_EVENT_NAME } from 'lib/cache/cache-invalidate';
import { logger } from 'lib/utils/logging';
import { runInLocaleContext } from 'lib/localization/locale-context';
import { getLayersData } from 'lib/localization/layers-data';
import { forceString } from 'lib/utils/string-utils';

export const get = (req: Request) => {
    const
        contentId = forceString(req.params.contentId),
        locale = forceString(req.params.locale);

    if (!contentId) {
        const msg = 'No contentId specified for cache invalidate service';
        logger.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    if (!locale) {
        const msg = 'No locale specified for cache invalidate service';
        logger.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    const content = runInLocaleContext({ locale }, () => contentLib.get({ key: contentId }));
    if (!content) {
        const msg = `No content found for id ${contentId}`;
        logger.info(msg);
        return {
            status: 400,
            message: msg,
        };
    }

    const { localeToRepoIdMap } = getLayersData();

    eventLib.send({
        type: CACHE_INVALIDATE_EVENT_NAME,
        distributed: true,
        data: {
            id: content._id,
            path: content._path,
            branch: 'master',
            repo: localeToRepoIdMap[locale],
        },
    });

    logger.info(`Manually triggered cache invalidation for ${content._path}`);

    return { status: 204 };
};

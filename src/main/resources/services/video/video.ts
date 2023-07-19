import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';

import { getServiceRequestSubPath, transformUsageHit } from '../service-utils';

import { logger } from '../../lib/utils/logging';

type UsageCheckParams = {
    id: string;
};

export const getVideoUsage = (content: Content<'no.nav.navno:video'>) => {
    const contentWithUsage = contentLib.query({
        start: 0,
        count: 1000,
        query: `components.part.config.no-nav-navno.html-area.html LIKE '*targetContent="${content._id}"*' OR data.text LIKE '*targetContent="${content._id}"*'`,
    }).hits;

    return [...contentWithUsage];
};

const usageCheckHandler = (req: XP.Request) => {
    const { id } = req.params as UsageCheckParams;

    const detailsContent = contentLib.get({ key: id });
    if (!detailsContent || detailsContent.type !== 'no.nav.navno:video') {
        logger.warning(`Product details usage check for id ${id} failed - content does not exist`);
        return {
            status: 404,
            contentType: 'application/json',
            body: {
                usage: [],
            },
        };
    }

    const usageHits = getVideoUsage(detailsContent).map(transformUsageHit);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            usage: usageHits,
        },
    };
};

export const get = (req: XP.Request) => {
    const subPath = getServiceRequestSubPath(req);

    if (subPath === 'usage') {
        return usageCheckHandler(req);
    }

    return {
        status: 201,
    };
};

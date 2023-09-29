import * as contentLib from '/lib/xp/content';
import { getServiceRequestSubPath } from '../service-utils';
import { logger } from '../../lib/utils/logging';
import { dependenciesCheckHandler } from '../../lib/references/custom-dependencies-check';

const getVideoUsage = (contentId: string) => {
    const content = contentLib.get({ key: contentId });

    if (!content || content.type !== 'no.nav.navno:video') {
        const msg = `Video usage check for id ${contentId} failed - content does not exist`;
        logger.warning(msg);

        return null;
    }

    const contentWithUsage = contentLib.query({
        start: 0,
        count: 1000,
        query: `components.part.config.no-nav-navno.html-area.html LIKE '*targetContent="${content._id}"*' OR data.text LIKE '*targetContent="${content._id}"*'`,
    }).hits;

    return contentWithUsage;
};

export const get = (req: XP.Request) => {
    const subPath = getServiceRequestSubPath(req);

    if (subPath === 'usage') {
        return dependenciesCheckHandler({ req, generalResolver: getVideoUsage });
    }

    return {
        status: 201,
    };
};

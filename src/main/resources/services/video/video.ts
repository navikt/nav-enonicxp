import * as contentLib from '/lib/xp/content';
import { getServiceRequestSubPath } from '../service-utils';
import { logger } from '../../lib/utils/logging';
import { dependenciesCheckHandler } from '../../lib/references/custom-dependencies-check';
import { findContentsWithText } from '../../lib/utils/htmlarea-utils';

const getVideoUsage = (contentId: string) => {
    const content = contentLib.get({ key: contentId });
    if (!content || content.type !== 'no.nav.navno:video') {
        logger.warning(`Video usage check for id ${contentId} failed - content does not exist`);
        return null;
    }

    return findContentsWithText(`video targetContent=\\"${contentId}\\"`);
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

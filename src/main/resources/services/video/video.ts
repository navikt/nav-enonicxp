import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getServiceRequestSubPath } from '../service-utils';
import { logger } from '../../lib/utils/logging';
import {
    CustomDependenciesCheckParams,
    transformToCustomDependencyData,
} from '../../lib/references/custom-dependencies-check';

export const getVideoDependencies = (content: Content<'no.nav.navno:video'>) => {
    const contentWithUsage = contentLib.query({
        start: 0,
        count: 1000,
        query: `components.part.config.no-nav-navno.html-area.html LIKE '*targetContent="${content._id}"*' OR data.text LIKE '*targetContent="${content._id}"*'`,
    }).hits;

    return contentWithUsage;
};

const dependenciesCheckHandler = (req: XP.Request) => {
    const { id, layer } = req.params as CustomDependenciesCheckParams;

    const videoContent = contentLib.get({ key: id });
    if (!videoContent || videoContent.type !== 'no.nav.navno:video') {
        const msg = `Video usage check for id ${id} failed - content does not exist`;
        logger.warning(msg);

        return {
            status: 404,
            contentType: 'application/json',
            body: {
                message: msg,
            },
        };
    }

    const dependencies = getVideoDependencies(videoContent).map((content) =>
        transformToCustomDependencyData(content)
    );

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            general: dependencies,
        },
    };
};

export const get = (req: XP.Request) => {
    const subPath = getServiceRequestSubPath(req);

    if (subPath === 'usage') {
        return dependenciesCheckHandler(req);
    }

    return {
        status: 201,
    };
};

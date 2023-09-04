import { isUUID } from '../../../lib/utils/uuid';
import { getPublishedVersionRefs } from '../../../lib/utils/version-utils';
import { logger } from '../../../lib/utils/logging';
import { getLayersData } from '../../../lib/localization/layers-data';

export const publishedVersionsReqHandler = (req: XP.Request) => {
    const { id, locale } = req.params;

    if (!id || !isUUID(id)) {
        return {
            status: 400,
            body: {
                message: 'Parameter "id" must be a valid contentId',
            },
            contentType: 'application/json',
        };
    }

    if (!locale || !getLayersData().localeToRepoIdMap[locale]) {
        return {
            status: 400,
            body: {
                message: 'Parameter "locale" must be a valid layer locale',
            },
            contentType: 'application/json',
        };
    }

    const publishedVersionRefs = getPublishedVersionRefs(id, locale).map(
        (version) => version.timestamp
    );

    try {
        return {
            status: 200,
            contentType: 'application/json',
            body: publishedVersionRefs,
        };
    } catch (e) {
        logger.error(`Error while retrieving published version timestamps - ${e}`);

        return {
            status: 500,
            contentType: 'application/json',
            body: { msg: `Server error: ${e}` },
        };
    }
};

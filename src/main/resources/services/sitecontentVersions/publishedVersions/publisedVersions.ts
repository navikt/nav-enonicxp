import { isUUID } from '../../../lib/utils/uuid';
import { getPublishedVersionTimestamps } from '../../../lib/utils/version-utils';
import { logger } from '../../../lib/utils/logging';
import { getLayersData } from '../../../lib/localization/layers-data';
import { runInLocaleContext } from '../../../lib/localization/locale-context';

export const publishedVersionsReqHandler = (req: XP.Request) => {
    const { id, locale } = req.params;

    if (!id || !isUUID(id)) {
        return {
            status: 400,
            body: {
                message: 'No valid id parameter was provided',
            },
            contentType: 'application/json',
        };
    }

    const { defaultLocale } = getLayersData();

    const publisedTimestamps = runInLocaleContext({ locale: locale || defaultLocale }, () =>
        getPublishedVersionTimestamps(id)
    );

    try {
        return {
            status: 200,
            contentType: 'application/json',
            body: publisedTimestamps,
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

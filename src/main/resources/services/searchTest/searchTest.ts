import { buildExternalSearchDocument } from '../../lib/search/external/document-builder';
import { getRepoConnection } from '../../lib/utils/repo-utils';
import { getLayersData } from '../../lib/localization/layers-data';
import { logger } from '../../lib/utils/logging';

export const get = (req: XP.Request) => {
    const { contentId, locale } = req.params;

    if (!contentId || !locale) {
        return {
            status: 400,
        };
    }

    const content = getRepoConnection({
        branch: 'master',
        repoId: getLayersData().localeToRepoIdMap[locale],
        asAdmin: true,
    }).get(contentId);

    if (!content) {
        return {
            status: 404,
        };
    }

    const searchDocument = buildExternalSearchDocument(content, locale);

    logger.info(`Search document: ${JSON.stringify(searchDocument)}`);

    return {
        status: 200,
        contentType: 'application/json',
        body: searchDocument,
    };
};

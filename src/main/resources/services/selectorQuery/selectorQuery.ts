import httpClient from '/lib/http-client';
import { urls } from '../../lib/constants';
import { logger } from '../../lib/utils/logging';

/*
 * This service simplifies queries to the content studio selector service
 * as a fallback when a query fails. This is done in order to support very
 * long queries, which may throw TooComplexToDeterminizeException with the
 * default fulltext + ngram query sent from content-studio
 *
 * */

const selectorQueryContentStudioUrl = `${urls.portalAdminOrigin}/selectorQuery`;

const selectorQueryRequest = (req: XP.Request) =>
    httpClient.request({
        ...req,
        url: selectorQueryContentStudioUrl,
    });

const selectorQuerySimpleRequest = (req: XP.Request) => {
    const body = JSON.parse(req.body);
    const { queryExpr } = body;
    // The query from content studio looks something like this:
    // (((fulltext('displayName^5,_name^3,_alltext', 'My search term', 'AND') OR ngram('displayName^5,_nam...<etc>
    // We want to extract the search term
    const searchTerm = queryExpr.split("', '")[1];

    return selectorQueryRequest({
        ...req,
        body: JSON.stringify({
            ...body,
            queryExpr: `displayName LIKE "${searchTerm}*"`,
        }),
    });
};

export const post = (req: XP.Request) => {
    try {
        const response = selectorQueryRequest(req);

        if (response.status >= 500) {
            logger.info(
                `Error from selectorQuery, trying fallback - ${response.status} ${response.message}`
            );

            return selectorQuerySimpleRequest(req);
        }

        return response;
    } catch (e) {
        logger.info(`Exception from selectorQuery, trying fallback - ${e}`);

        return selectorQuerySimpleRequest(req);
    }
};

/*
 * This service simplifies queries to the content studio selector service
 * as a fallback when a query fails. This is done in order to support very
 * long queries, which may throw TooComplexToDeterminizeException with the
 * default fulltext + ngram query sent from content-studio
 *
 * */

const httpClient = require('/lib/http-client');
const { portalAdminOrigin } = require('/lib/headless/url-origin');

const selectorQueryContentStudioUrl = `${portalAdminOrigin}/selectorQuery`;

const selectorQueryRequest = (req) =>
    httpClient.request({
        ...req,
        url: selectorQueryContentStudioUrl,
    });

const selectorQuerySimpleRequest = (req) => {
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

const selectorQuery = (req) => {
    try {
        const response = selectorQueryRequest(req);

        if (response.status >= 500) {
            log.info(
                `Error from selectorQuery, trying fallback - ${response.status} ${response.message}`
            );

            return selectorQuerySimpleRequest(req);
        }

        return response;
    } catch (e) {
        log.info(`Exception from selectorQuery, trying fallback - ${e}`);

        return selectorQuerySimpleRequest(req);
    }
};

exports.post = selectorQuery;

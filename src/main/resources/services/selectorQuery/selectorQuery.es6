/*
 * This service simplifies queries to the content studio selector service
 * as a fallback when a query fails. This is done in order to support very
 * long queries, which may throw TooComplexToDeterminizeException with the
 * default fulltext + ngram query sent from content-studio
 *
 * */

const httpClient = require('/lib/http-client');
const { xpOrigin } = require('/lib/headless/url-origin');

const selectorQueryContentStudioUrl = `${xpOrigin}/selectorQuery`;

const selectorQueryRequest = (req) =>
    httpClient.request({
        method: 'POST',
        url: selectorQueryContentStudioUrl,
        connectionTimeout: 5000,
        contentType: 'application/json',
        headers: req.headers,
        body: req.body,
    });

const selectorQuerySimpleRequest = (req) => {
    const body = JSON.parse(req.body);
    const { queryExpr } = body;
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
    const response = selectorQueryRequest(req);

    if (response.status >= 500) {
        log.info(
            `Error from selectorQuery, trying fallback - ${response.status} ${response.message}`
        );

        const simpleResponse = selectorQuerySimpleRequest(req);

        log.info(`Fallback response: ${JSON.stringify(simpleResponse)}`);

        return simpleResponse;
    }

    return response;
};

exports.post = selectorQuery;

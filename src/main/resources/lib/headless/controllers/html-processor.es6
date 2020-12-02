const portalLib = require('/lib/xp/portal');
const httpClient = require('/lib/http-client');
const { xpOrigin } = require('/lib/headless/url-origin');

// Runs the processHtml result through the site-engine HTTP pipeline, which
// ensures post-processing instructions for macros/components/etc are handled
//
// (This strange workaround can probably be removed at some point, if/when Enonic provides
// alternative ways to run html post-processing)
const processHtmlWithPostProcessing = (html, type) => {
    try {
        const processedHtmlResponse = httpClient.request({
            url: `${xpOrigin}/_/?processHtml=true}`,
            method: 'POST',
            body: JSON.stringify({
                html: html,
                type: type,
            }),
            contentType: 'application/json',
            connectionTimeout: 1000,
        });

        return processedHtmlResponse.body;
    } catch (e) {
        log.error(`Html processing controller failed: ${e}`);
    }

    return () => portalLib.processHtml({ value: html, type: type });
};

// This controller should be mapped to respond to post-requests with ?processHtml=true
const htmlProcessor = (req) => {
    const { html, type } = JSON.parse(req.body);

    if (!html) {
        return {
            contentType: 'text/html',
            body: '',
        };
    }

    const processedHtml = portalLib.processHtml({
        value: html,
        type: type,
    });

    return {
        contentType: 'text/html',
        body: processedHtml,
    };
};

module.exports = { post: htmlProcessor, processHtmlWithPostProcessing };

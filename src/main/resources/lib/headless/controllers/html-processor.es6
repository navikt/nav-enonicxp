const portalLib = require('/lib/xp/portal');
const httpClient = require('/lib/http-client');
const { xpOrigin } = require('/lib/headless/url-origin');
const contextLib = require('/lib/xp/context');
const { runInBranchContext } = require('/lib/headless/run-in-context');

// Runs the processHtml result through the site-engine HTTP pipeline, which
// ensures post-processing instructions for macros/components/etc are handled
//
// (This strange workaround can probably be removed at some point, if/when Enonic provides
// alternative ways to run html post-processing)
const processHtmlWithPostProcessing = (html, type) => {
    const { branch } = contextLib.get();

    try {
        const processedHtmlResponse = httpClient.request({
            url: `${xpOrigin}/_/?processHtml=true}`,
            method: 'POST',
            body: JSON.stringify({
                html,
                type,
                branch,
            }),
            contentType: 'application/json',
            connectionTimeout: 1000,
        });

        if (processedHtmlResponse?.status === 200) {
            return processedHtmlResponse.body;
        }
    } catch (e) {
        log.error(`Html processing controller failed: ${e}`);
    }

    return portalLib.processHtml({ value: html, type: type });
};

// This controller should be mapped to respond to post-requests with ?processHtml=true
const htmlProcessor = (req) => {
    const { html, type, branch } = JSON.parse(req.body);

    if (!html) {
        return {
            contentType: 'text/html',
            body: '',
        };
    }

    if (branch === 'draft') {
        const processedHtml = runInBranchContext(
            () =>
                portalLib.processHtml({
                    value: html,
                    type: 'server', // Always use server-relative urls for draft
                }),
            'draft'
        ).replace(/\/_\//g, '/admin/site/preview/default/draft/_/'); // Insert draft preview prefix to asset paths

        return {
            contentType: 'text/html',
            body: processedHtml,
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

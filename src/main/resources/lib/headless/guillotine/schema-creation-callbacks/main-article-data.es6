const httpClient = require('/lib/http-client');
const { xpOrigin } = require('/lib/headless/url-origin');
const portalLib = require('/lib/xp/portal');

const mainArticleDataCallback = (context, params) => {
    params.fields.text.resolve = (env) => {
        const html = env.source.text;

        if (env.args.processHtml) {
            const type = env.args.processHtml.type;

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
                log.info(`Html processing controller failed: ${e}`);
            }

            return portalLib.processHtml({ value: html, type: type });
        }

        return html;
    };
};

module.exports = mainArticleDataCallback;

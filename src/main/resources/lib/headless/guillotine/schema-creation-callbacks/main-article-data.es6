const httpClient = require('/lib/http-client');
const { xpOrigin } = require('/lib/headless/url-origin');

const mainArticleDataCallback = (context, params) => {
    params.fields.text.resolve = (env) => {
        const processedHtmlResponse = httpClient.request({
            url: `${xpOrigin}/_/?processHtml=true}`,
            method: 'POST',
            body: JSON.stringify({ html: env.source.text }),
            contentType: 'application/json',
            connectionTimeout: 1000,
        });

        return processedHtmlResponse.body;
    };
};

module.exports = mainArticleDataCallback;

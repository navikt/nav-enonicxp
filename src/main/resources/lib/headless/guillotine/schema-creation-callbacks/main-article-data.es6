const httpClient = require('/lib/http-client');
const { xpOrigin } = require('/lib/headless/url-origin');

const mainArticleDataCallback = (context, params) => {
    params.fields.text.resolve = (env) => {
        if (env.args.processHtml) {
            const processedHtmlResponse = httpClient.request({
                url: `${xpOrigin}/_/?processHtml=true}`,
                method: 'POST',
                body: JSON.stringify({
                    html: env.source.text,
                    type: env.args.processHtml.type,
                }),
                contentType: 'application/json',
                connectionTimeout: 1000,
            });

            return processedHtmlResponse.body;
        }

        return env.source.text;
    };
};

module.exports = mainArticleDataCallback;

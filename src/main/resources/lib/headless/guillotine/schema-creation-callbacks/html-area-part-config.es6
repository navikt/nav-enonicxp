const { processHtmlWithPostProcessing } = require('/lib/headless/controllers/html-processor');
const { htmlCleanUp } = require('./common/html-cleanup');

const libs = {
    utils: require('/lib/nav-utils'),
};

const htmlAreaPartConfigCallback = (context, params) => {
    params.fields.filters.resolve = (env) => {
        const filters = env.source?.filters;
        return filters ? libs.utils.forceArray(filters) : null;
    };

    params.fields.html.resolve = (env) => {
        const html = env.source?.html;

        return html
            ? processHtmlWithPostProcessing(htmlCleanUp(html, env.args.processHtml.type))
            : null;
    };
};

module.exports = { htmlAreaPartConfigCallback };

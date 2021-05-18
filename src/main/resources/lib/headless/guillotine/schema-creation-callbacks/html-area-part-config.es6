const { forceArray } = require('/lib/nav-utils');
const { htmlCleanUp } = require('./common/html-cleanup');

const htmlAreaPartConfigCallback = (context, params) => {
    params.fields.html.resolve = (env) => {
        const html = env.source?.html;

        return html ? htmlCleanUp(html, env.args.processHtml.type) : null;
    };

    params.fields.filters.resolve = (env) => {
        const filters = env.source?.filters;

        return filters ? forceArray(filters) : null;
    };
};

module.exports = { htmlAreaPartConfigCallback };

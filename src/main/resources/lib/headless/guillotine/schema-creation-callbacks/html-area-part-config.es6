const { processHtmlWithPostProcessing } = require('/lib/headless/controllers/html-processor');
const { htmlCleanUp } = require('./common/html-cleanup');

const htmlAreaPartConfigCallback = (context, params) => {
    params.fields.html.resolve = (env) => {
        const html = env.source?.html;

        return html
            ? processHtmlWithPostProcessing(htmlCleanUp(html, env.args.processHtml.type))
            : null;
    };
};

module.exports = { htmlAreaPartConfigCallback };

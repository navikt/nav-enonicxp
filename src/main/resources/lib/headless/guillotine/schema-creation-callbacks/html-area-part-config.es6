const { htmlCleanUp } = require('./common/html-cleanup');

const htmlAreaPartConfigCallback = (context, params) => {
    // Resolve html-fields in data-object
    params.fields.html.resolve = (env) => {
        const html = env.source?.html;
        return html ? htmlCleanUp(html) : '';
    };
};

module.exports = { htmlAreaPartConfigCallback };

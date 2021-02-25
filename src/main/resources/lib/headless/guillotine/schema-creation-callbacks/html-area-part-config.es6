const { htmlCleanUp } = require('./common/html-cleanup');

const htmlAreaPartConfigCallback = (context, params) => {
    params.fields.html.resolve = (env) => {
        const html = env.source?.html;
        return html ? htmlCleanUp(html) : null;
    };
};

module.exports = { htmlAreaPartConfigCallback };

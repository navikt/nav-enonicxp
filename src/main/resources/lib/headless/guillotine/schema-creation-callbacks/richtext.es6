const linebreaksFilter = new RegExp(/(\r\n|\n|\r|\s)/gi);

const richTextCallback = (context, params) => {
    params.fields.processedHtml.resolve = (env) => {
        return env.source.processedHtml.replace(linebreaksFilter, ' ');
    };
};

module.exports = { richTextCallback };

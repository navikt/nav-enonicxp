const linebreaksFilter = new RegExp(/(\r\n|\n|\r|\s)/gi);

const richTextCallback = (context, params) => {
    params.fields.processedHtml.resolve = (env) => {
        const { processedHtml } = env.source;

        return processedHtml
            ? env.source.processedHtml.replace(linebreaksFilter, ' ')
            : processedHtml;
    };
};

module.exports = { richTextCallback };

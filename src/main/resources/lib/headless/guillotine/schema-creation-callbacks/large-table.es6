const { htmlCleanUp } = require('./common/html-cleanup');

const largeTableCallback = (context, params) => {

    // Resolve html-field in data-object
    params.fields.data.resolve = (env) => {
        const data = env.source?.data;
        const text = data?.text ? htmlCleanUp(data.text) : '';
        return {
            ...data,
            text,
        }
    };
};

module.exports = largeTableCallback;

const { contentListResolver } = require('./common/content-list-resolver');

const contentListCallback = (sortFunc) => (context, params) => {
    params.fields.target.resolve = contentListResolver('target', 'numLinks', sortFunc);
};

module.exports = contentListCallback;

const { contentListResolver } = require('./common/content-list-resolver');

const contentListCallback = (sortByKey) => (context, params) => {
    params.fields.target.resolve = contentListResolver('target', 'numLinks', sortByKey);
};

module.exports = contentListCallback;

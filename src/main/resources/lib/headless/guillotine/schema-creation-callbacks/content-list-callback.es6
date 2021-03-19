const { contentListResolver } = require('./common/content-list-resolver');

const contentListCallback = (sortByField) => (context, params) => {
    params.fields.target.resolve = contentListResolver('target', 'numLinks', sortByField);
};

module.exports = contentListCallback;

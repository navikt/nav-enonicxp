const { sortByLastModifiedDesc } = require('/lib/headless/sort');
const { contentListResolver } = require('./common/content-list-resolver');

const sectionPageDataCallback = (context, params) => {
    params.fields.newsContents.resolve = contentListResolver(
        'newsContents',
        'nrNews',
        sortByLastModifiedDesc
    );
    params.fields.ntkContents.resolve = contentListResolver('ntkContents', 'nrNTK');
    params.fields.scContents.resolve = contentListResolver('scContents', 'nrSC');
};

module.exports = sectionPageDataCallback;

const contentLib = require('/lib/xp/content');
const { updateIndexForContent } = require('/lib/content-indexing/search-indexing');

// Temporary service for populating an external search index
const searchIndexDocuments = (req) => {
    const { path } = req.params;

    if (!path) {
        return {
            status: 400,
            contentType: 'application/json',
            body: { message: "Missing parameter 'path'" },
        };
    }

    const content = contentLib.get({ key: path });

    if (!content) {
        return {
            status: 400,
            contentType: 'application/json',
            body: { message: 'Content not found' },
        };
    }

    const indexerResponse = updateIndexForContent(content);

    if (!indexerResponse) {
        return {
            status: 500,
            contentType: 'application/json',
            body: { message: 'Unknown error from indexer' },
        };
    }

    return indexerResponse;
};

exports.get = searchIndexDocuments;

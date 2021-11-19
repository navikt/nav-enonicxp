const httpClient = require('/lib/http-client');
const { searchIndexerBaseUrl } = require('/lib/headless/url-origin');
const { getExternalUrl } = require('/lib/content-indexing/indexing-utils');

const addDocumentApiUrl = `${searchIndexerBaseUrl}/addDocument`;

const contentTypesToIndex = {
    [`${app.name}:situation-page`]: true,
    [`${app.name}:content-page-with-sidemenus`]: true,
    [`${app.name}:main-article`]: true,
    [`${app.name}:office-information`]: true,
};

const sendDocumentToIndexer = (document) => {
    try {
        const response = httpClient.request({
            url: addDocumentApiUrl,
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify({
                document: document,
                index: 'nav-enonicxp',
            }),
        });

        log.info(
            `Sent document for ${document.url} to indexer - response: ${JSON.stringify(response)}`
        );
        return response;
    } catch (e) {
        log.error(`Error while sending document for ${document.url} to indexer - ${e}`);
        return null;
    }
};

const indexContent = (content) => {
    if (!content) {
        return null;
    }

    const { _id, _path, type, displayName, data } = content;

    if (!data || !contentTypesToIndex[type]) {
        return null;
    }

    const { noindex, metaDescription, keywords } = data;

    if (noindex) {
        return null;
    }

    log.info(`Indexing content ${_path}`);

    const url = getExternalUrl(content);

    const indexDocument = {
        id: _id,
        url,
        header: displayName,
        description: metaDescription,
        content: 'Placeholder McPlaceholderface',
        keywords,
    };

    return sendDocumentToIndexer(indexDocument);
};

const noop = () => {};

module.exports = {
    indexContent: searchIndexerBaseUrl ? indexContent : noop,
};

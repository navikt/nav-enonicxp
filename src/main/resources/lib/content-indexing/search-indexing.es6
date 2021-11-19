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
            body: JSON.stringify(document),
        });

        log.info(
            `Sent document for ${document.url} to indexer - response: ${JSON.stringify(response)}`
        );
    } catch (e) {
        log.error(`Error while sending document for ${document.url} to indexer - ${e}`);
    }
};

const indexContent = (content) => {
    if (!content) {
        return;
    }

    const { _id, _path, type, displayName, modifiedTime, publish, data } = content;

    if (!data || !contentTypesToIndex[type]) {
        return;
    }

    const { noindex, metaDescription, keywords } = data;

    if (noindex) {
        return;
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

    sendDocumentToIndexer(indexDocument);
};

const indexContentNoop = () => {};

module.exports = {
    indexContent: !!searchIndexerBaseUrl ? indexContent : indexContentNoop,
};

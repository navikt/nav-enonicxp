const httpClient = require('/lib/http-client');
const contentLib = require('/lib/xp/content');
const { runInBranchContext } = require('/lib/headless/branch-context');
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
        description: metaDescription || data.ingress || 'Descriptiony McDescriptionface',
        content: data.text || 'Contenty McContentface',
        keywords,
    };

    return sendDocumentToIndexer(indexDocument);
};

const repopulateSearchIndex = () => {
    const contentToIndex = runInBranchContext(
        () =>
            contentLib.query({
                start: 0,
                count: 10000,
                contentTypes: Object.keys(contentTypesToIndex),
            }).hits,
        'master'
    );

    log.info(`Found ${contentToIndex.length} contents to index`);

    contentToIndex.forEach((content) => {
        indexContent(content);
    });
};

const noop = () => {};

module.exports = {
    indexContent: searchIndexerBaseUrl ? indexContent : noop,
    repopulateSearchIndex,
};

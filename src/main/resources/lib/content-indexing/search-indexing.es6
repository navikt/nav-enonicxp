const httpClient = require('/lib/http-client');
const { getIndexableContent } = require('/lib/content-indexing/indexing-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { searchIndexerBaseUrl } = require('/lib/headless/url-origin');
const { getExternalUrl } = require('/lib/content-indexing/indexing-utils');

const addDocumentApiUrl = `${searchIndexerBaseUrl}/addDocument`;
const deleteDocumentApiUrl = `${searchIndexerBaseUrl}/deleteDocument`;

const searchIndex = 'nav-enonicxp';

const contentTypesToIndex = {
    [`${app.name}:situation-page`]: true,
    [`${app.name}:content-page-with-sidemenus`]: true,
    [`${app.name}:main-article`]: true,
    [`${app.name}:office-information`]: true,
};

const sendDocumentToIndex = (document) => {
    try {
        const response = httpClient.request({
            url: addDocumentApiUrl,
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify({
                document: document,
                index: searchIndex,
            }),
        });

        log.info(
            `Sent document for ${document.url} to indexer - response: ${response.status} ${response.message}`
        );
        return response;
    } catch (e) {
        log.error(`Error while sending document for ${document.url} to indexer - ${e}`);
        return null;
    }
};

const deleteDocumentFromIndex = (id) => {
    try {
        const response = httpClient.request({
            url: deleteDocumentApiUrl,
            method: 'GET',
            contentType: 'application/json',
            queryParams: {
                index: searchIndex,
                id,
            },
        });

        log.info(
            `Sent delete request to index for id ${id} - response: ${response.status} ${response.message}`
        );
        return response;
    } catch (e) {
        log.error(`Error while deleting document with id ${id} from index - ${e}`);
        return null;
    }
};

const indexContent = (content) => {
    if (!content) {
        return null;
    }

    const { _id, type, displayName, data } = content;

    if (!data || !contentTypesToIndex[type]) {
        return null;
    }

    const { noindex, metaDescription, keywords } = data;

    if (noindex) {
        return null;
    }

    const indexDocument = {
        id: _id,
        url: getExternalUrl(content),
        header: displayName,
        description: metaDescription || data.ingress || 'Descriptiony McDescriptionface',
        content: data.text || 'Contenty McContentface',
        keywords,
    };

    return sendDocumentToIndex(indexDocument);
};

const repopulateSearchIndex = () => {
    const contentToIndex = runInBranchContext(() => getIndexableContent(contentToIndex), 'master');

    const startTimeMs = Date.now();

    log.info(`Found ${contentToIndex.length} contents to index`);

    contentToIndex.forEach((content) => {
        indexContent(content);
    });

    const timeElapsedSec = (Date.now() - startTimeMs) / 1000;

    log.info(`Finished indexing content. Time elapsed: ${timeElapsedSec} sec`);
};

const updateIndexForContent = searchIndexerBaseUrl ? indexContent : () => {};

module.exports = {
    updateIndexForContent,
    repopulateSearchIndex,
    deleteDocumentFromIndex,
};

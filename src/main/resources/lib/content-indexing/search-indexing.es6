const httpClient = require('/lib/http-client');
const eventLib = require('/lib/xp/event');
const clusterLib = require('/lib/xp/cluster');
const { getIndexableContent } = require('/lib/content-indexing/indexing-utils');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { searchIndexerBaseUrl } = require('/lib/headless/url-origin');
const { getExternalUrl } = require('/lib/content-indexing/indexing-utils');

const indexApiLiveness = `${searchIndexerBaseUrl}/internal/isAlive`;
const addDocumentApiUrl = `${searchIndexerBaseUrl}/indexDocument`;
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

const deleteIndexDocument = (id) => {
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

const updateIndexDocument = (contentId) => {
    if (!contentId) {
        log.info(`No content id provided`);
        return null;
    }

    const content = getIndexableContent({ ids: contentId, contentTypes: contentTypesToIndex });

    if (!content) {
        log.info(`No indexable content found for id ${contentId}`);
        return null;
    }

    const { _id, displayName, data } = content[0];

    if (!data) {
        log.info(`Invalid data object for ${contentId}`);
        return null;
    }

    const { noindex, metaDescription, keywords, ingress } = data;

    if (noindex) {
        log.info(`${contentId} has noindex flag, skipping`);
        return null;
    }

    const indexDocument = {
        id: _id,
        url: getExternalUrl(contentId),
        header: displayName,
        description: metaDescription || ingress || 'Descriptiony McDescriptionface',
        content: data.text || 'Contenty McContentface',
        keywords,
    };

    return sendDocumentToIndex(indexDocument);
};

const indexApiLivenessCheck = () => {
    if (!searchIndexerBaseUrl) {
        return;
    }

    const response = httpClient.request({
        url: indexApiLiveness,
        method: 'GET',
        contentType: 'application/json',
    });

    log.info(JSON.stringify(response));
};

const repopulateSearchIndex = () => {
    indexApiLivenessCheck();

    const contentToIndex = runInBranchContext(
        () => getIndexableContent({ contentTypes: contentToIndex }),
        'master'
    );

    const startTimeMs = Date.now();

    log.info(`Found ${contentToIndex.length} contents to index`);

    contentToIndex.forEach((content) => {
        updateIndexDocument(content);
    });

    const timeElapsedSec = (Date.now() - startTimeMs) / 1000;

    log.info(`Finished indexing content. Time elapsed: ${timeElapsedSec} sec`);
};

const startSearchIndexEventListener = () => {
    if (!searchIndexerBaseUrl) {
        log.info('No search indexer is configured for this environment');
        return;
    }

    log.info('Starting event listener for search indexing');

    eventLib.listener({
        type: '(node.pushed|node.deleted)',
        localOnly: false,
        callback: (event) => {
            log.info(`New event: ${event.type}`);
            log.info(`Is master? ${clusterLib.isMaster()}`);
            if (clusterLib.isMaster()) {
                event.data.nodes.forEach((node) => {
                    const { id } = node;

                    log.info(`Updating index for ${id}`);

                    if (event.type === 'node.deleted') {
                        deleteIndexDocument(id);
                    } else {
                        updateIndexDocument(id);
                    }
                });
            }
        },
    });
};

module.exports = {
    repopulateSearchIndex,
    startSearchIndexEventListener,
};

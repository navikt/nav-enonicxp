import { getExternalSearchConfig } from './config';
import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { forceArray } from '../utils/array-utils';
import { getRepoConnection } from '../repos/repo-utils';
import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';
import { buildExternalSearchDocument, SearchDocument } from './document-builder/document-builder';
import { getLayersData } from '../localization/layers-data';
import { searchApiPostDocumentsAsync } from './api-handlers/post-document';

const MAX_COUNT = 50000;
const BATCH_SIZE = 2000;

const getValidContentTypes = (searchConfig: Content<'no.nav.navno:search-config-v2'>): string[] => {
    return forceArray(searchConfig.data.contentGroups)
        .map((group) => group.contentTypes)
        .flat();
};

const getContentToIndex = (contentTypes: string[]) => {
    return queryAllLayersToRepoIdBuckets({
        branch: 'main',
        state: 'localized',
        resolveContent: false,
        queryParams: {
            count: MAX_COUNT,
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: 'type',
                                values: contentTypes,
                            },
                        },
                    ],
                },
            },
        },
    });
};

const sendToSearchApi = (repoId: string, contentIds: string[]) => {
    const repo = getRepoConnection({ repoId, branch: 'main', asAdmin: true });
    const locale = getLayersData().repoIdToLocaleMap[repoId];

    if (!locale) {
        logger.error(`${repoId} is not a valid layers repo!`);
        return;
    }

    const totalContents = contentIds.length;

    for (let batchStart = 0; batchStart < totalContents; batchStart += BATCH_SIZE) {
        const contentBatch = forceArray(
            repo.get<Content>(contentIds.slice(batchStart, batchStart + BATCH_SIZE))
        );

        const documents = contentBatch.reduce<SearchDocument[]>((acc, content) => {
            if (!content) {
                return acc;
            }

            const document = buildExternalSearchDocument(content, locale);
            if (!document) {
                return acc;
            }

            acc.push(document);

            return acc;
        }, []);

        const progress = batchStart + contentBatch.length;

        logger.info(
            `Sending documents batch for ${documents.length}/${contentBatch.length} contents to search api - Total progress for locale "${locale}": ${progress}/${totalContents}`
        );

        searchApiPostDocumentsAsync(documents);
    }
};

export const externalSearchUpdateAll = () => {
    const searchConfig = getExternalSearchConfig();
    if (!searchConfig) {
        logger.error('No search config found!');
        return;
    }

    const validContentTypes = getValidContentTypes(searchConfig);
    if (validContentTypes.length === 0) {
        logger.error('No valid content types found in search config!');
        return;
    }

    const start = Date.now();

    const contentToIndex = getContentToIndex(validContentTypes);

    Object.entries(contentToIndex).forEach(([repoId, contentIds]) => {
        logger.info(`Found ${contentIds.length} content to index in repo ${repoId}`);
        sendToSearchApi(repoId, contentIds);
    });

    logger.info(`External search full update completed in ${(Date.now() - start) / 1000} seconds`);
};

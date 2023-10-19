import { getExternalSearchConfig } from './config';
import { Content } from '/lib/xp/content';
import { logger } from '../../utils/logging';
import { forceArray } from '../../utils/array-utils';
import { getRepoConnection } from '../../utils/repo-utils';
import { queryAllLayersToLocaleBuckets } from '../../localization/locale-utils';
import { buildExternalSearchDocument, ExternalSearchDocument } from './document-builder';
import { getLayersData } from '../../localization/layers-data';
import { searchApiPostDocuments } from './api-handlers/post-document';

const MAX_COUNT = 50000;
const BATCH_SIZE = 2000;

const getValidContentTypes = (searchConfig: Content<'no.nav.navno:search-config-v2'>): string[] => {
    return forceArray(searchConfig.data.contentGroups)
        .map((group) => group.contentTypes)
        .flat();
};

const getContentToIndex = (contentTypes: string[]) => {
    return queryAllLayersToLocaleBuckets({
        branch: 'master',
        state: 'localized',
        resolveContentData: false,
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
    const repo = getRepoConnection({ repoId, branch: 'master', asAdmin: true });
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

        const documents = contentBatch.reduce<ExternalSearchDocument[]>((acc, content) => {
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
            `Posting documents for ${documents.length}/${contentBatch.length} contents to search api - Total progress for locale "${locale}": ${progress}/${totalContents}`
        );

        // searchApiPostDocuments(documents);
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

    const contentToIndex = getContentToIndex(validContentTypes);

    Object.entries(contentToIndex).forEach(([repoId, contentIds]) => {
        sendToSearchApi(repoId, contentIds);
    });
};

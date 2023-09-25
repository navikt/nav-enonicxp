import * as nodeLib from '/lib/xp/node';
import { MultiRepoNodeQueryHit, NodeQueryParams } from '/lib/xp/node';
import * as contentLib from '/lib/xp/content';
import { Content, BooleanFilter, BasicFilters } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { getLayersData } from './layers-data';
import { logger } from '../utils/logging';
import { runInLocaleContext } from './locale-context';
import { forceArray } from '../utils/array-utils';
import { batchedContentQuery, batchedMultiRepoNodeQuery } from '../utils/batched-query';

export const getLayersMultiConnection = (branch: RepoBranch) => {
    return nodeLib.multiRepoConnect({
        sources: getLayersData().sources[branch],
    });
};

export const NON_LOCALIZED_QUERY_FILTER: BasicFilters[] = [
    {
        hasValue: {
            field: 'inherit',
            values: ['CONTENT'],
        },
    },
];

type LocalizationState = 'localized' | 'nonlocalized' | 'all';

const localizationStateFilters: Record<LocalizationState, BooleanFilter['boolean']> = {
    localized: { mustNot: NON_LOCALIZED_QUERY_FILTER },
    nonlocalized: { must: NON_LOCALIZED_QUERY_FILTER },
    all: {},
};

type ContentAndLayerData = {
    content: Content;
    locale: string;
    repoId: string;
};

export const getContentFromAllLayers = ({
    contentId,
    branch,
    state,
}: {
    contentId: string;
    branch: RepoBranch;
    state: LocalizationState;
}): ContentAndLayerData[] => {
    const localizedNodes = getLayersMultiConnection(branch).query({
        start: 0,
        count: 100,
        filters: {
            ids: {
                values: [contentId],
            },
            boolean: localizationStateFilters[state],
        },
    }).hits;

    const { repoIdToLocaleMap } = getLayersData();

    return localizedNodes.reduce<ContentAndLayerData[]>((acc, node) => {
        const { repoId, id } = node;

        const locale = repoIdToLocaleMap[repoId];
        if (!locale) {
            logger.critical(`No locale found for repoId ${repoId}`);
            return acc;
        }

        const content = runInLocaleContext({ branch, locale }, () => contentLib.get({ key: id }));
        if (!content) {
            logger.warning(`Content not found: ${id} in repo ${repoId} in branch ${branch}`);
            return acc;
        }

        return [...acc, { content, locale, repoId }];
    }, []);
};

export const buildLocalePath = (basePath: string, locale: string) => {
    const { defaultLocale, localeToRepoIdMap } = getLayersData();

    if (locale === defaultLocale || !localeToRepoIdMap[locale]) {
        return basePath;
    }

    const localeSuffix = `/${locale}`;

    if (basePath.endsWith(localeSuffix)) {
        return basePath;
    }

    // Removes trailing slash from base path
    return basePath.replace(/(\/)?$/, localeSuffix);
};

export const isContentLocalized = (content: Content) =>
    !forceArray(content.inherit).includes('CONTENT');

export type NodeHitsLocaleBuckets = Record<string, string[]>;

export const sortMultiRepoNodeHitIdsToRepoIdBuckets = (hits: readonly MultiRepoNodeQueryHit[]) => {
    return hits.reduce<NodeHitsLocaleBuckets>((acc, node) => {
        const { repoId, id } = node;

        if (!acc[repoId]) {
            acc[repoId] = [];
        }

        acc[repoId].push(id);

        return acc;
    }, {});
};

export type LocaleContentBuckets = Record<string, Content[]>;

export const queryAllLayersToLocaleBuckets = ({
    branch,
    state = 'localized',
    queryParams,
}: {
    branch: RepoBranch;
    state: LocalizationState;
    queryParams: NodeQueryParams;
}) => {
    const multiRepoConnection = getLayersMultiConnection(branch);

    const multiRepoQueryResult = batchedMultiRepoNodeQuery({
        repo: multiRepoConnection,
        queryParams,
    });

    const buckets = sortMultiRepoNodeHitIdsToRepoIdBuckets(multiRepoQueryResult.hits);

    return Object.entries(buckets).reduce<LocaleContentBuckets>((acc, [repoId, contentIds]) => {
        const locale = getLayersData().repoIdToLocaleMap[repoId];
        const localeHits = runInLocaleContext({ locale, branch }, () =>
            batchedContentQuery({
                count: contentIds.length,
                filters: {
                    ids: {
                        values: contentIds,
                    },
                    boolean: localizationStateFilters[state],
                },
            })
        );

        acc[locale] = localeHits.hits;

        return acc;
    }, {});
};

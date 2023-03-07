import * as nodeLib from '/lib/xp/node';
import { MultiRepoNodeQueryHit } from '/lib/xp/node';
import * as contentLib from '/lib/xp/content';
import { Content, BooleanFilter, BasicFilters } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { getLayersData } from './layers-data';
import { logger } from '../utils/logging';
import { runInLocaleContext } from './locale-context';
import { forceArray } from '../utils/array-utils';

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
            logger.critical(`Content not found: ${id} in repo ${repoId} in branch ${branch}`);
            return acc;
        }

        return [...acc, { content, locale, repoId }];
    }, []);
};

export const buildLocalePath = (basePath: string, locale: string) => {
    const { defaultLocale } = getLayersData();

    const localeSuffix = `/${locale}`;

    if (locale === defaultLocale || basePath.endsWith(localeSuffix)) {
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

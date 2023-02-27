import * as nodeLib from '/lib/xp/node';
import { MultiRepoNodeQueryHit } from '/lib/xp/node';
import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { getLayersData } from './layers-data';
import { logger } from '../utils/logging';
import { runInLocaleContext } from './locale-context';
import { forceArray } from '../utils/nav-utils';

export type NodeHitsLocaleBuckets = Record<string, string[]>;

export const getLayersMultiConnection = (branch: RepoBranch) => {
    return nodeLib.multiRepoConnect({
        sources: getLayersData().sources[branch],
    });
};

export const getLocalizedContentVersions = (contentId: string, branch: RepoBranch) => {
    const localizedNodes = getLayersMultiConnection(branch).query({
        start: 0,
        count: 100,
        filters: {
            ids: {
                values: [contentId],
            },
            boolean: {
                mustNot: [
                    {
                        hasValue: {
                            field: 'inherit',
                            values: ['CONTENT'],
                        },
                    },
                ],
            },
        },
    }).hits;

    const { repoIdToLocaleMap } = getLayersData();

    return localizedNodes.reduce((acc, node) => {
        const locale = repoIdToLocaleMap[node.repoId];
        if (!locale) {
            logger.critical(`No locale found for repoId ${node.repoId}`);
            return acc;
        }

        const content = runInLocaleContext({ branch, locale }, () =>
            contentLib.get({ key: node.id })
        );
        if (!content) {
            logger.critical(
                `Content not found: ${node.id} in repo ${node.repoId} in branch ${node.branch}`
            );
            return acc;
        }

        return [...acc, content];
    }, [] as Content[]);
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

export const sortMultiRepoNodeHitIdsToLocaleBuckets = (hits: readonly MultiRepoNodeQueryHit[]) => {
    return hits.reduce<NodeHitsLocaleBuckets>((acc, node) => {
        const { repoId, id } = node;

        if (!acc[repoId]) {
            acc[repoId] = [];
        }

        acc[repoId].push(id);

        return acc;
    }, {});
};

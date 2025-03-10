import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { RunQueryParams, RunExternalArchiveQueryParams } from './types';
import { batchedMultiRepoNodeQuery } from '../../../lib/utils/batched-query';
import { logger } from '../../../lib/utils/logging';
import * as nodeLib from '/lib/xp/node';
import { getLayersData } from '../../../lib/localization/layers-data';
import { ContentDescriptor } from '../../../types/content-types/content-config';

const buildQuery = (queryStrings: (string | undefined)[]) =>
    queryStrings.filter(Boolean).join(' AND ');

export const getNodeHitsFromQuery = ({
    query,
    publishStatus,
    types,
    requestId,
    notExistsFilter,
}: RunQueryParams) => {
    const repoBranch = publishStatus === 'published' ? 'master' : 'draft';

    const repoConnection = getLayersMultiConnection(repoBranch);

    const mustFilter = [
        ...(notExistsFilter || []),
        ...(types
            ? [
                  {
                      hasValue: {
                          field: 'type',
                          values: types,
                      },
                  },
              ]
            : []),
    ];

    const result = batchedMultiRepoNodeQuery({
        repo: repoConnection,
        queryParams: {
            query:
                buildQuery([
                    query,
                    `_path LIKE ${publishStatus === 'archived' ? '"/archive/*"' : '"/content/*"'}`,
                ]) || undefined,
            start: 0,
            count: 100000,
            filters: {
                boolean: {
                    must: mustFilter,
                    mustNot: [
                        {
                            hasValue: {
                                field: 'inherit',
                                values: ['CONTENT'],
                            },
                        },
                        ...(publishStatus === 'unpublished'
                            ? [
                                  {
                                      exists: {
                                          field: 'publish.from',
                                      },
                                  },
                              ]
                            : []),
                    ],
                },
            },
        },
    }).hits;

    logger.info(`Data query: Total hits for request ${requestId}: ${result.length}`);

    return result;
};

const curatedTypes: ContentDescriptor[] = [
    'no.nav.navno:content-page-with-sidemenus',
    'no.nav.navno:themed-article-page',
    'no.nav.navno:situation-page',
    'no.nav.navno:guide-page',
    'no.nav.navno:main-article',
    'no.nav.navno:current-topic-page',
    'no.nav.navno:external-link',
    'no.nav.navno:internal-link',
    'no.nav.navno:product-details',
    'no.nav.navno:global-case-time-set',
    'no.nav.navno:payout-dates',
];

export const getNodeHitsFromExternalArchiveQuery = ({
    displayName,
    searchType,
    requestId,
}: RunExternalArchiveQueryParams) => {
    const types = searchType === 'curated' ? curatedTypes : [];
    const query = `displayName LIKE "*${displayName}*"`;
    const getQueryParams = (): nodeLib.QueryNodeParams => {
        return {
            query: buildQuery([
                query,
                searchType === 'other'
                    ? `NOT type IN (${curatedTypes.map((t) => `"${t}"`).join(',')})`
                    : undefined,
            ]),
            start: 0,
            count: 100000,
            filters: {
                boolean: {
                    must: [
                        { notExists: { field: 'data.externalProductUrl' } },
                        {
                            hasValue: {
                                field: 'type',
                                values: types,
                            },
                        },
                        { exists: { field: 'publish.first' } },
                    ],
                    mustNot: [
                        {
                            hasValue: {
                                field: 'inherit',
                                values: ['CONTENT'],
                            },
                        },
                    ],
                    should: [
                        {
                            notExists: { field: 'x.no-nav-navno.previewOnly.previewOnly' },
                            hasValue: {
                                field: 'x.no-nav-navno.previewOnly.previewOnly',
                                values: ['false'],
                            },
                        },
                    ],
                },
            },
        };
    };

    const layerDataDraft = getLayersData().sources['draft'];
    const masterDataDraft = getLayersData().sources['master'];

    const repoConnection = nodeLib.multiRepoConnect({
        sources: [...layerDataDraft, ...masterDataDraft],
    });

    const nodeHits = batchedMultiRepoNodeQuery({
        repo: repoConnection,
        queryParams: getQueryParams(),
    }).hits;

    const uniqueNodeHits = nodeHits.filter(
        (nodeHit, index, nodehitslist) =>
            index === nodehitslist.findIndex((t) => t.id === nodeHit.id)
    );
    logger.info(`Data query: Total hits for request ${requestId}: ${uniqueNodeHits.length}`);

    return uniqueNodeHits;
};

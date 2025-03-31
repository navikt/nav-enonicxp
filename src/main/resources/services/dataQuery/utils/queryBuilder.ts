import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { RunQueryParams, RunExternalArchiveQueryParams } from './types';
import { batchedMultiRepoNodeQuery } from '../../../lib/utils/batched-query';
import { logger } from '../../../lib/utils/logging';
import { RepoBranch } from '../../../types/common';
import * as nodeLib from '/lib/xp/node';
import { getLayersData } from '../../../lib/localization/layers-data';

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

export const getNodeHitsFromExternalArchiveQuery = ({
    query,
    types,
    requestId,
}: RunExternalArchiveQueryParams) => {
    const getQueryParams = (branch: RepoBranch) => {
        return {
            query: buildQuery([query]),
            start: 0,
            count: 100000,
            filters: {
                boolean: {
                    must: [
                        { notExists: { field: 'data.externalProductUrl' } },
                        { notExists: { field: 'data._layerMigration' } },
                        {
                            hasValue: {
                                field: 'type',
                                values: types,
                            },
                        },
                        ...(branch === 'draft' ? [{ exists: { field: 'publish.first' } }] : []),
                    ],
                    mustNot: [
                        {
                            hasValue: {
                                field: 'x.no-nav-navno.previewOnly.previewOnly',
                                values: ['true'],
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
        queryParams: getQueryParams('draft'),
    }).hits;

    const uniqueNodeHits = nodeHits.filter(
        (nodeHit, index, nodehitslist) =>
            index === nodehitslist.findIndex((t) => t.id === nodeHit.id)
    );
    logger.info(`Data query: Total hits for request ${requestId}: ${uniqueNodeHits.length}`);

    return uniqueNodeHits;
};

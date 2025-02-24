import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { RunQueryParams, RunExternalArchiveQueryParams } from './types';
import { batchedMultiRepoNodeQuery } from '../../../lib/utils/batched-query';
import { logger } from '../../../lib/utils/logging';
import { RepoBranch } from '../../../types/common';

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
    notExistsFilter,
}: RunExternalArchiveQueryParams) => {
    const getQueryParams = (branch: RepoBranch) => {
        return {
            query: buildQuery([query]),
            start: 0,
            count: 100000,
            filters: {
                boolean: {
                    must: [
                        ...notExistsFilter,
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
                                field: 'inherit',
                                values: ['CONTENT'],
                            },
                        },
                    ],
                },
            },
        };
    };

    const masterRepoConnection = getLayersMultiConnection('master');
    const masterNodeHits = batchedMultiRepoNodeQuery({
        repo: masterRepoConnection,
        queryParams: getQueryParams('master'),
    }).hits;

    const draftRepoConnection = getLayersMultiConnection('draft');
    const draftNodeHits = batchedMultiRepoNodeQuery({
        repo: draftRepoConnection,
        queryParams: getQueryParams('draft'),
    }).hits;

    logger.info(
        `Data query: Total hits for request ${requestId}: ${masterNodeHits.length + draftNodeHits.length}`
    );

    return { masterNodeHits, draftNodeHits };
};

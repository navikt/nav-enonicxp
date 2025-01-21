import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { RunQueryParams } from './types';
import { batchedMultiRepoNodeQuery } from '../../../lib/utils/batched-query';
import { logger } from '../../../lib/utils/logging';

const buildQuery = (queryStrings: (string | undefined)[]) =>
    queryStrings.filter(Boolean).join(' AND ');

export const getNodeHitsFromQuery = ({
    query,
    branch,
    types,
    requestId,
    notExistsFilter,
}: RunQueryParams) => {
    const repoBranch = branch === 'published' ? 'master' : 'draft';

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
                    `_path LIKE ${branch === 'archived' ? '"/archive/*"' : '"/content/*"'}`,
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
                        ...(branch === 'unpublished'
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

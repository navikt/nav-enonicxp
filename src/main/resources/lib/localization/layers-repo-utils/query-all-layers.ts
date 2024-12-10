import { QueryNodeParams, QueryDsl } from '/lib/xp/node';
import { batchedMultiRepoNodeQuery } from '../../utils/batched-query';
import { RepoBranch } from '../../../types/common';
import { insertLocalizationStateFilter, LocalizationState } from './localization-state-filters';
import {
    RepoIdContentBuckets,
    RepoIdNodeIdBuckets,
    sortMultiRepoNodeHitsToBuckets,
} from './sort-and-resolve-hits';
import { getLayersMultiConnection } from './layers-repo-connection';

// TODO: support including archived content with an argument?
// (Not needed atm, but keep in mind it only includes live content!)
type Args<ResolveContent = boolean> = {
    branch: RepoBranch;
    state: LocalizationState;
    queryParams: QueryNodeParams;
    resolveContent: ResolveContent;
};

const ARCHIVE_EXCLUDED_STRING_QUERY = '_path NOT LIKE "/archive/*"';

const insertArchiveExcludedQueryString = (query?: string | QueryDsl) => {
    if (!query) {
        return ARCHIVE_EXCLUDED_STRING_QUERY;
    }

    return typeof query === 'string'
        ? `${ARCHIVE_EXCLUDED_STRING_QUERY} AND (${query})`
        : {
              boolean: {
                  must: query,
                  mustNot: {
                      like: {
                          field: '_path',
                          value: '/archive/*',
                      },
                  },
              },
          };
};

export function queryAllLayersToRepoIdBuckets(args: Args<false>): RepoIdNodeIdBuckets;
export function queryAllLayersToRepoIdBuckets(args: Args<true>): RepoIdContentBuckets;
export function queryAllLayersToRepoIdBuckets({
    branch,
    state,
    queryParams,
    resolveContent,
}: Args) {
    const multiRepoConnection = getLayersMultiConnection(branch);

    const multiRepoQueryResult = batchedMultiRepoNodeQuery({
        repo: multiRepoConnection,
        queryParams: {
            ...insertLocalizationStateFilter(queryParams, state),
            query: insertArchiveExcludedQueryString(queryParams.query),
        },
    });
    return resolveContent
        ? sortMultiRepoNodeHitsToBuckets({
              hits: multiRepoQueryResult.hits,
              resolveContent: true,
              branch,
          })
        : sortMultiRepoNodeHitsToBuckets({
              hits: multiRepoQueryResult.hits,
              resolveContent: false,
          });
}

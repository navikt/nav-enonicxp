import { NodeQueryParams } from '/lib/xp/node';
import { batchedMultiRepoNodeQuery } from '../../utils/batched-query';
import { RepoBranch } from '../../../types/common';
import { insertLocalizationStateFilter, LocalizationState } from './localization-state-filters';
import {
    LocaleContentBuckets,
    LocaleNodeIdBuckets,
    sortMultiRepoNodeHitsToBuckets,
} from './sort-and-resolve-hits';
import { getLayersMultiConnection } from './layers-repo-connection';

type Args<ResolveContent = boolean> = {
    branch: RepoBranch;
    state: LocalizationState;
    queryParams: NodeQueryParams;
    resolveContent: ResolveContent;
};

export function queryAllLayersToRepoIdBuckets(args: Args<false>): LocaleNodeIdBuckets;
export function queryAllLayersToRepoIdBuckets(args: Args<true>): LocaleContentBuckets;
export function queryAllLayersToRepoIdBuckets({
    branch,
    state,
    queryParams,
    resolveContent,
}: Args) {
    const multiRepoConnection = getLayersMultiConnection(branch);

    const multiRepoQueryResult = batchedMultiRepoNodeQuery({
        repo: multiRepoConnection,
        queryParams: insertLocalizationStateFilter(queryParams, state),
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

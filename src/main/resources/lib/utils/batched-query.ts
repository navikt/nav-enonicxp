import * as contentLib from '/lib/xp/content';
import { QueryContentParams, ContentsResult } from '/lib/xp/content';
import * as nodeLib from '/lib/xp/node';
import {
    RepoConnection,
    MultiRepoConnection,
    QueryNodeParams,
    NodeQueryResult,
    NodeQueryResultHit,
    NodeMultiRepoQueryResult,
    ConnectParams,
} from '/lib/xp/node';
import { ContentDescriptor } from '../../types/content-types/content-config';

type ContentQueryFunc = typeof contentLib.query;
type NodeQueryFunc = RepoConnection['query'];

type ContentQueryProps<ContentType extends ContentDescriptor> = {
    queryParams: QueryContentParams<ContentType>;
    queryFunc: ContentQueryFunc;
};

type NodeQueryProps = {
    queryParams: QueryNodeParams;
    queryFunc: NodeQueryFunc;
};

const BATCH_SIZE = 3000;

// TODO: consider refactoring, bit hard to read

// NOTE: if a filter value array with a length greater than the batch size is passed to a query
// the batches may not be consistent when the queries are performed in a clustered setup!
const batchedQuery = <ContentType extends ContentDescriptor>({
    queryFunc,
    queryParams,
}: ContentQueryProps<ContentType> | NodeQueryProps) => {
    const { start: startParam = 0, count: countParam } = queryParams;

    const getRemainingCount = (start: number) => {
        // If no count parameter was specified, we always get a full batch
        if (!countParam) {
            return BATCH_SIZE;
        }

        // Else we calculate the remainder of the specified count, and use this if it's
        // smaller than a full batch
        return Math.min(BATCH_SIZE, countParam - start);
    };

    const getBatchHits = (start: number): ReadonlyArray<NodeQueryResultHit> => {
        const count = getRemainingCount(start);

        // (TS can't infer that queryParams type will always match the queryFunc signature...)
        const result = (queryFunc as any)({
            ...queryParams,
            start,
            count,
        });

        const accumulatedCount = start + result.count;

        // If there are more results to get...
        if (result.total > accumulatedCount) {
            // ...and we haven't hit the count specified by the parameter...
            if (!countParam || countParam > accumulatedCount) {
                // ...then we get another batch of hits
                const nextStart = start + BATCH_SIZE;
                return [...result.hits, ...getBatchHits(nextStart)];
            }
        }

        return result.hits;
    };

    const countFirst = getRemainingCount(startParam);

    // (TS can't infer that queryParams type will always match the queryFunc signature...)
    const firstBatch = (queryFunc as any)({ ...queryParams, start: startParam, count: countFirst });

    // If there are more hits to retrieve, we run batched queries
    if (firstBatch.total > countFirst + startParam) {
        const hits = [...firstBatch.hits, ...getBatchHits(startParam + countFirst)];

        return {
            total: firstBatch.total,
            count: hits.length,
            hits,
            aggregations: [],
        };
    }

    return {
        ...firstBatch,
        aggregations: [],
    };
};

type BatchedNodeQueryParams = {
    queryParams: QueryNodeParams;
} & (
    | {
          repoParams: ConnectParams;
          repo?: never;
      }
    | {
          repo: RepoConnection;
          repoParams?: never;
      }
);

export const batchedNodeQuery = ({
    queryParams,
    repoParams,
    repo,
}: BatchedNodeQueryParams): NodeQueryResult => {
    const _repo = repo || nodeLib.connect(repoParams);

    return batchedQuery({ queryFunc: _repo.query.bind(_repo), queryParams });
};

export const batchedMultiRepoNodeQuery = ({
    repo,
    queryParams,
}: {
    repo: MultiRepoConnection;
    queryParams: QueryNodeParams;
}): NodeMultiRepoQueryResult => {
    return batchedQuery({ queryFunc: repo.query.bind(repo), queryParams });
};

export const batchedContentQuery = <ContentType extends ContentDescriptor>(
    queryParams: QueryContentParams<ContentType>
): ContentsResult<ContentType> => {
    return batchedQuery<ContentType>({ queryFunc: contentLib.query, queryParams });
};

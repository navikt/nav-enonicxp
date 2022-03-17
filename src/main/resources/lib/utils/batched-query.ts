import contentLib, { QueryParams, Content, QueryResponse } from '/lib/xp/content';
import nodeLib, { NodeQueryParams, NodeQueryResponse, Source, NodeQueryHit } from '/lib/xp/node';
import { ContentDescriptor } from '../../types/content-types/content-config';

const BATCH_SIZE = 1000;

export const batchedNodeQuery = (
    repoParams: Source,
    queryParams: NodeQueryParams
): NodeQueryResponse => {
    const { start: startParam = 0, count: countParam } = queryParams;

    const repo = nodeLib.connect(repoParams);

    const getRemainingCount = (start: number) => {
        // If no count parameter was specified, we always get a full batch
        if (!countParam) {
            return BATCH_SIZE;
        }

        // Else we calculate the remainder of the specified count, and use this if it's
        // smaller than a full batch
        return Math.min(BATCH_SIZE, countParam - start);
    };

    const getBatchHits = (start: number): ReadonlyArray<NodeQueryHit> => {
        const count = getRemainingCount(start);
        const result = repo.query({ ...queryParams, start, count });

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
    const firstBatch = repo.query({ ...queryParams, start: startParam, count: countFirst });

    // If there are more hits to retrieve, we run batched queries
    if (firstBatch.total > countFirst + startParam) {
        const hits = [...firstBatch.hits, ...getBatchHits(startParam + BATCH_SIZE)];

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

export const batchedContentQuery = <ContentType extends ContentDescriptor>(
    queryParams: QueryParams<ContentType>
): QueryResponse<ContentType> => {
    const getBatchHits = (start = 0): ReadonlyArray<Content<ContentType>> => {
        const result = contentLib.query({ ...queryParams, start, count: BATCH_SIZE });
        const nextStart = start + BATCH_SIZE;

        if (result.total >= nextStart) {
            return [...result.hits, ...getBatchHits(nextStart)];
        }

        return result.hits;
    };

    const result = contentLib.query({ ...queryParams, start: 0, count: BATCH_SIZE });

    if (result.total > BATCH_SIZE) {
        return { ...result, hits: [...result.hits, ...getBatchHits(BATCH_SIZE)] };
    }

    return result;
};

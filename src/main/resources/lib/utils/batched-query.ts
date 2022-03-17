import contentLib, { QueryParams, QueryResponse, ContentLibrary } from '/lib/xp/content';
import nodeLib, {
    NodeQueryParams,
    NodeQueryResponse,
    Source,
    NodeQueryHit,
    RepoConnection,
} from '/lib/xp/node';
import { ContentDescriptor } from '../../types/content-types/content-config';

const BATCH_SIZE = 1000;

type ContentQueryFunc = ContentLibrary['query'];
type NodeQueryFunc = RepoConnection['query'];

type ContentQueryProps<ContentType extends ContentDescriptor> = {
    queryParams: QueryParams<ContentType>;
    queryFunc: ContentQueryFunc;
};

type NodeQueryProps = {
    queryParams: NodeQueryParams;
    queryFunc: NodeQueryFunc;
};

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

    const getBatchHits = (start: number): ReadonlyArray<NodeQueryHit> => {
        const count = getRemainingCount(start);

        // @ts-ignore (TS can't infer that queryParams type will always match the queryFunc signature...)
        const result = queryFunc({
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

    // @ts-ignore (TS can't infer that queryParams type will always match the queryFunc signature...)
    const firstBatch = queryFunc({ ...queryParams, start: startParam, count: countFirst });

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

export const batchedNodeQuery = (
    repoParams: Source,
    queryParams: NodeQueryParams
): NodeQueryResponse => {
    const repo = nodeLib.connect(repoParams);

    return batchedQuery({ queryFunc: repo.query, queryParams });
};

export const batchedContentQuery = <ContentType extends ContentDescriptor>(
    queryParams: QueryParams<ContentType>
): QueryResponse<ContentType> => {
    return batchedQuery<ContentType>({ queryFunc: contentLib.query, queryParams });
};

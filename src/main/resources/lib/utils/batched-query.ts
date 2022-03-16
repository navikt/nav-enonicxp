import contentLib, { QueryParams, Content } from '/lib/xp/content';
import nodeLib, { NodeQueryParams, NodeQueryHit, Source } from '/lib/xp/node';
import { ContentDescriptor } from '../../types/content-types/content-config';

const MAX_BATCH_SIZE = 1000;

export const batchedNodeQuery = (
    queryParams: NodeQueryParams,
    repoParams: Source,
    batchSize = MAX_BATCH_SIZE
) => {
    const repo = nodeLib.connect(repoParams);

    const getBatch = (start = 0): ReadonlyArray<NodeQueryHit> => {
        const result = repo.query({ ...queryParams, start, count: batchSize });
        const nextStart = start + batchSize;

        if (result.total >= nextStart) {
            return [...result.hits, ...getBatch(nextStart)];
        }

        return result.hits;
    };

    return getBatch();
};

export const batchedContentQuery = <ContentType extends ContentDescriptor>(
    queryParams: Omit<QueryParams<ContentType>, 'start' | 'count'>,
    batchSize = MAX_BATCH_SIZE
) => {
    const getBatch = (start = 0): ReadonlyArray<Content<ContentType>> => {
        const result = contentLib.query<ContentType>({ ...queryParams, start, count: batchSize });
        const nextStart = start + batchSize;

        if (result.total >= nextStart) {
            return [...result.hits, ...getBatch(nextStart)];
        }

        return result.hits;
    };

    return getBatch();
};

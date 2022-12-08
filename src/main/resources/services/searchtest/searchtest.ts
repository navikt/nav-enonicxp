import { batchedContentQuery } from '../../lib/utils/batched-query';

let ids: string[] = [];

export const get = (req: XP.Request) => {
    const { query } = req.params;

    ids = ids.length
        ? ids
        : batchedContentQuery({
              start: 0,
              count: 50000,
              contentTypes: ['no.nav.navno:main-article', 'no.nav.navno:large-table'],
          }).hits.map((hit) => hit._id);

    const start = Date.now();

    const { hits } = batchedContentQuery({
        start: 0,
        count: 20,
        query,
        filters: {
            ids: {
                values: ids,
            },
        },
    });

    return {
        status: 200,
        body: {
            time: Date.now() - start,
            itemsCount: ids.length,
            hits: hits.map((hit) => ({
                _id: hit._id,
                _path: hit._path,
            })),
        },
        contentType: 'application/json',
    };
};

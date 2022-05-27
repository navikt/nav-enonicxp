import contentLib, { Content } from '/lib/xp/content';
import { ProductDetails } from '../../site/content-types/product-details/product-details';
import { parseJsonArray, stripPathPrefix } from '../../lib/utils/nav-utils';
import { runInBranchContext } from '../../lib/utils/branch-context';

type ProductDetailsType = ProductDetails['detailType'];
type SelectorHit = XP.CustomSelectorServiceResponseHit;

type Params = {
    detailType: ProductDetailsType;
} & XP.CustomSelectorServiceRequestParams;

const transformHit = (content: Content<'no.nav.navno:product-details'>): SelectorHit => ({
    id: content._id,
    displayName: content.displayName,
    description: `Språk: ${content.language} - Path: ${stripPathPrefix(content._path)}`,
});

const getHitsWithQuery = (
    detailType: ProductDetailsType,
    query?: string,
    ids?: string[]
): SelectorHit[] => {
    const { hits } = contentLib.query({
        count: 1000,
        contentTypes: ['no.nav.navno:product-details'],
        query,
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'data.detailType',
                        values: [detailType],
                    },
                },
            },
            ...(ids && {
                ids: {
                    values: ids,
                },
            }),
        },
    });

    return hits.map(transformHit);
};

export const get = (req: XP.Request) => {
    const { detailType, query, ids } = req.params as Params;

    log.info(`Params: ${JSON.stringify(req.params)}`);

    const idsParsed = ids && parseJsonArray<string>(ids);

    const hits = runInBranchContext(
        () => getHitsWithQuery(detailType, query, idsParsed || undefined),
        'master'
    );

    log.info(`Hits: ${JSON.stringify(hits)}`);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            hits,
            count: hits.length,
            total: hits.length,
        },
    };
};

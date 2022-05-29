import contentLib, { Content } from '/lib/xp/content';
import { ProductDetails } from '../../site/content-types/product-details/product-details';
import { generateFulltextQuery, stripPathPrefix } from '../../lib/utils/nav-utils';
import { runInBranchContext } from '../../lib/utils/branch-context';
import { contentStudioEditPathPrefix } from '../../lib/constants';
import { customSelectorHitWithLink } from '../service-utils';

type ProductDetailsType = ProductDetails['detailType'];
type SelectorHit = XP.CustomSelectorServiceResponseHit;

type Params = {
    detailType: ProductDetailsType;
} & XP.CustomSelectorServiceRequestParams;

const transformHit = (content: Content<'no.nav.navno:product-details'>): SelectorHit =>
    customSelectorHitWithLink(
        {
            id: content._id,
            displayName: content.displayName,
            description: `[${content.language}] ${stripPathPrefix(content._path)}`,
        },
        `${contentStudioEditPathPrefix}/${content._id}`
    );

const getHitsWithQuery = (
    detailType: ProductDetailsType,
    query?: string,
    ids?: string
): SelectorHit[] => {
    const { hits } = contentLib.query({
        count: 1000,
        contentTypes: ['no.nav.navno:product-details'],
        query: query && generateFulltextQuery(query, ['displayName'], 'AND'),
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
                    values: [ids],
                },
            }),
        },
    });

    return hits.map(transformHit);
};

export const get = (req: XP.Request) => {
    const { detailType, query, ids } = req.params as Params;

    const hits = runInBranchContext(() => getHitsWithQuery(detailType, query, ids), 'master');

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

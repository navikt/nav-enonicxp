import contentLib, { Content } from '/lib/xp/content';
import { ProductDetails } from '../../site/content-types/product-details/product-details';
import { generateFulltextQuery, stripPathPrefix } from '../../lib/utils/nav-utils';
import { runInBranchContext } from '../../lib/utils/branch-context';
import { contentStudioEditPathPrefix } from '../../lib/constants';
import { customSelectorHitWithLink, getSubPath, transformUsageHit } from '../service-utils';
import { getProductDetailsUsage } from '../../lib/productList/productDetails';
import { logger } from '../../lib/utils/logging';

type ProductDetailsType = ProductDetails['detailType'];
type SelectorHit = XP.CustomSelectorServiceResponseHit;

type SelectorParams = {
    detailType: ProductDetailsType;
} & XP.CustomSelectorServiceRequestParams;

type UsageCheckParams = {
    id: string;
};

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

const usageCheckHandler = (req: XP.Request) => {
    const { id } = req.params as UsageCheckParams;

    const detailsContent = contentLib.get({ key: id });
    if (!detailsContent || detailsContent.type !== 'no.nav.navno:product-details') {
        logger.warning(`Product details usage check for id ${id} failed - content does not exist`);
        return {
            status: 404,
            contentType: 'application/json',
            body: {
                usage: [],
            },
        };
    }

    const usageHits = getProductDetailsUsage(detailsContent).map(transformUsageHit);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            usage: usageHits,
        },
    };
};

const selectorHandler = (req: XP.Request) => {
    const { detailType, query, ids } = req.params as SelectorParams;

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

export const get = (req: XP.Request) => {
    const subPath = getSubPath(req);

    if (subPath === 'usage') {
        return usageCheckHandler(req);
    }

    return selectorHandler(req);
};

import contentLib, { Content } from '/lib/xp/content';
import { ProductDetails } from '../../site/content-types/product-details/product-details';
import { generateFulltextQuery, stripPathPrefix } from '../../lib/utils/nav-utils';
import { runInBranchContext } from '../../lib/utils/branch-context';
import { contentStudioEditPathPrefix } from '../../lib/constants';
import { customSelectorHitWithLink, getSubPath, transformUsageHit } from '../service-utils';
import { getProductDetailsUsage } from '../../lib/product-utils/productDetails';
import { logger } from '../../lib/utils/logging';
import { customSelectorErrorIcon } from '../custom-selector-icons';

type ProductDetailsType = ProductDetails['detailType'];
type ProductDetailsContentType = Content<'no.nav.navno:product-details'>;
type SelectorHit = XP.CustomSelectorServiceResponseHit;

type SelectorParams = {
    detailType: ProductDetailsType;
} & XP.CustomSelectorServiceRequestParams;

type UsageCheckParams = {
    id: string;
};

const makeDescription = (content: Content) =>
    `[${content.language}] ${stripPathPrefix(content._path)}`;

const transformHit = (content: ProductDetailsContentType): SelectorHit =>
    customSelectorHitWithLink(
        {
            id: content._id,
            displayName: content.displayName,
            description: makeDescription(content),
        },
        `${contentStudioEditPathPrefix}/${content._id}`
    );

const makeErrorHit = (id: string, displayName: string, description?: string): SelectorHit =>
    customSelectorHitWithLink(
        {
            id,
            displayName,
            description,
            icon: customSelectorErrorIcon,
        },
        `${contentStudioEditPathPrefix}/${id}`
    );

const getSelectedHit = (selectedId: string, detailType: ProductDetailsType) => {
    const publishedContent = runInBranchContext(
        () => contentLib.get({ key: selectedId }),
        'master'
    );

    if (!publishedContent) {
        const unpublishedContent = runInBranchContext(
            () => contentLib.get({ key: selectedId }),
            'draft'
        );

        if (!unpublishedContent) {
            return makeErrorHit(selectedId, 'Feil: produktdetaljene finnes ikke');
        }

        return makeErrorHit(
            selectedId,
            'Feil: produktdetaljene er ikke publisert',
            makeDescription(unpublishedContent)
        );
    }

    if (publishedContent.type !== 'no.nav.navno:product-details') {
        return makeErrorHit(
            selectedId,
            'Feil: produktdetaljene har feil innholdstype',
            makeDescription(publishedContent)
        );
    }

    if (publishedContent.data.detailType !== detailType) {
        return makeErrorHit(
            selectedId,
            'Feil: produktdetaljene har feil type',
            makeDescription(publishedContent)
        );
    }

    return transformHit(publishedContent);
};

const getHitsFromQuery = (detailType: ProductDetailsType, query?: string): SelectorHit[] => {
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
        },
    });

    return hits.map(transformHit);
};

const selectorHandler = (req: XP.Request) => {
    const { detailType, query, ids } = req.params as SelectorParams;

    const hitsFromQuery = runInBranchContext(() => getHitsFromQuery(detailType, query), 'master');
    const selectedHit = ids && getSelectedHit(ids, detailType);

    const hits = [selectedHit, ...hitsFromQuery];

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

export const get = (req: XP.Request) => {
    const subPath = getSubPath(req);

    if (subPath === 'usage') {
        return usageCheckHandler(req);
    }

    return selectorHandler(req);
};

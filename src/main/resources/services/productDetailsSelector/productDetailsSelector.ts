import * as contentLib from '/lib/xp/content';
import * as portalLib from '/lib/xp/portal';
import { Content } from '/lib/xp/content';
import { generateFulltextQuery } from '../../lib/utils/mixed-bag-of-utils';
import { customSelectorHitWithLink, customSelectorParseSelectedIdsFromReq } from '../service-utils';
import { customSelectorErrorIcon } from '../custom-selector-icons';
import { stripPathPrefix } from '../../lib/paths/path-utils';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { ProductDetails } from '@xp-types/site/content-types';

type ProductDetailsType = ProductDetails['detailType'];
type ProductDetailsContentType = Content<'no.nav.navno:product-details'>;
type SelectorHit = XP.CustomSelectorServiceResponseHit;

type SelectorParams = {
    detailType: ProductDetailsType;
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
        content._id
    );

const makeErrorHit = (id: string, displayName: string, description: string): SelectorHit =>
    customSelectorHitWithLink(
        {
            id,
            displayName,
            description,
            icon: customSelectorErrorIcon,
        },
        id
    );

const getSelectedHit = (selectedId: string, detailType: ProductDetailsType, locale: string) => {
    const publishedContent = runInLocaleContext({ branch: 'master', locale }, () =>
        contentLib.get({ key: selectedId })
    );

    if (!publishedContent) {
        const unpublishedContent = runInLocaleContext({ branch: 'draft', locale }, () =>
            contentLib.get({ key: selectedId })
        );

        if (!unpublishedContent) {
            return makeErrorHit(selectedId, 'Feil: Valgte produktdetaljer finnes ikke', selectedId);
        }

        return makeErrorHit(
            selectedId,
            'Feil: Valgte produktdetaljer er ikke publisert',
            makeDescription(unpublishedContent)
        );
    }

    if (publishedContent.type !== 'no.nav.navno:product-details') {
        return makeErrorHit(
            selectedId,
            'Feil: Valgte produktdetaljer har feil innholdstype',
            makeDescription(publishedContent)
        );
    }

    if (publishedContent.data.detailType !== detailType) {
        return makeErrorHit(
            selectedId,
            'Feil: Valgte produktdetaljer har feil type',
            makeDescription(publishedContent)
        );
    }

    return transformHit(publishedContent);
};

const getHitsFromQuery = (
    detailType: ProductDetailsType,
    locale: string,
    query?: string
): SelectorHit[] => {
    const { hits } = runInLocaleContext({ branch: 'master', locale }, () =>
        contentLib.query({
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
        })
    );

    return hits.map(transformHit);
};

const selectorHandler = (req: XP.Request<XP.CustomSelectorServiceParams & SelectorParams>) => {
    const { detailType, query } = req.params;
    if (!detailType) {
        return {
            status: 400,
        };
    }

    const selectedId = customSelectorParseSelectedIdsFromReq(req)[0];

    const language = portalLib.getContent()?.language;
    if (!language) {
        return {
            status: 500,
        };
    }

    const hits = selectedId
        ? [getSelectedHit(selectedId, detailType, language)]
        : getHitsFromQuery(detailType, language, query);

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
    return selectorHandler(req);
};

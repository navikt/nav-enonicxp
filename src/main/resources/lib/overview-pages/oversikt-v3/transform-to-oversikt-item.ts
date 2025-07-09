import { Content } from '/lib/xp/content';
import { sanitize } from '/lib/xp/common';
import { ContentWithProductDetails, OversiktListItem } from './types';
import { getPublicPath } from '../../paths/public-path';
import { getLayersData } from '../../localization/layers-data';
import { forceArray } from '../../utils/array-utils';
import striptags from '/assets/striptags/3.2.0/src/striptags';
import {
    ContentWithFormDetails,
    FormDetailsMap,
    ProductDataInFormsOverviewItem,
    Taxonomy,
} from './types';
import { FormDetailsSelector } from '@xp-types/site/mixins/form-details-selector';
import { ContentPageWithSidemenus } from '@xp-types/site/content-types/content-page-with-sidemenus';

// Fields from nested mixins are not included in the generated types
type ContentWithMissingMixins = ContentWithFormDetails & {
    data: ProductDataInFormsOverviewItem &
        Pick<ContentPageWithSidemenus, 'externalProductUrl'> &
        Required<Pick<FormDetailsSelector, 'formDetailsTargets'>> & {
            keywords?: string | string[];
        };
};

const getUrl = (content: ContentWithFormDetails) => {
    const { externalProductUrl } = content.data;

    if (externalProductUrl) {
        // Temporary workaround for hiding the product link in the form details panel
        // by setting the external url to the nav.no origin
        return externalProductUrl === 'https://www.nav.no' ? null : externalProductUrl;
    }

    return getPublicPath(content, content.language || getLayersData().defaultLocale);
};

const getTaxonomy = (content: ContentWithFormDetails) => {
    if (content.type === 'no.nav.navno:guide-page') {
        return null;
    }
    return forceArray(content.data.taxonomy) as Taxonomy;
};

export const transformBasicOversiktItem = (
    productPage: ContentWithProductDetails
): OversiktListItem => {
    const { type, data, language, displayName } = productPage;
    const { title, audience, sortTitle, externalProductUrl } = data;

    const pageTitle = title || displayName;
    const listItemTitle = sortTitle || pageTitle;

    const { defaultLocale } = getLayersData();

    const productPageLocale = language || defaultLocale;

    return {
        title: listItemTitle,
        sortTitle: data.sortTitle || listItemTitle,
        audience: audience?._selected,
        taxonomy: getTaxonomy(productPage),
        area: forceArray(data.area),
        ingress: data.ingress ? striptags(data.ingress) : '',
        targetLanguage: productPageLocale,
        type,
        url: getUrl(productPage),
        illustration: data.illustration,
        anchorId: sanitize(listItemTitle),
        subItems: [],
        productLinks: [
            {
                language: productPageLocale,
                type,
                url: externalProductUrl || getPublicPath(productPage, productPageLocale),
                title: pageTitle,
            },
        ],
    };
};

export const transformProductDetail = (
    productPage: ContentWithProductDetails,
    productDetail: Content<'no.nav.navno:product-details'>
): OversiktListItem => {
    const title = productPage.data.title || productPage.displayName;
    const sortTitle = productPage.data.sortTitle || title;

    const taxonomy: Taxonomy = getTaxonomy(productPage) ?? null;

    return {
        url: getUrl(productPage),
        anchorId: sanitize(sortTitle),
        title,
        sortTitle,
        ingress: productPage.data.ingress,
        audience: productPage.data.audience?._selected || 'all',
        keywords: forceArray((productPage as ContentWithMissingMixins).data.keywords),
        type: productPage.type,
        targetLanguage: productPage.language || getLayersData().defaultLocale,
        illustration: productPage.data.illustration,
        area: forceArray(productPage.data.area),
        taxonomy,
        subItems: [
            {
                path: getPublicPath(
                    productDetail,
                    productPage.language || getLayersData().defaultLocale
                ),
                title: productPage.data.title,
                ingress: productPage.data.ingress ? striptags(productPage.data.ingress) : '',
                type: productPage.type,
            },
        ],
    };
};

export const getFormsOversiktListItemTransformer =
    (formDetailsMap: FormDetailsMap, overviewPageLanguage: string) =>
    (content: ContentWithFormDetails): OversiktListItem | null => {
        // Get the form details actually used in this content
        const relevantFormDetails = forceArray(content.data.formDetailsTargets).reduce<
            Content<'no.nav.navno:form-details'>[]
        >((acc, formDetailsId) => {
            const formDetails = formDetailsMap[formDetailsId];
            if (formDetails) {
                acc.push(formDetails);
            }

            return acc;
        }, []);

        if (relevantFormDetails.length === 0) {
            return null;
        }

        const title = content.data.title || content.displayName;
        const sortTitle = content.data.sortTitle || title;

        const taxonomy: Taxonomy = getTaxonomy(content) ?? null;

        const subItems = relevantFormDetails.map((formDetails) => ({
            path: getPublicPath(formDetails, overviewPageLanguage),
            title: formDetails.data.title,
            ingress: formDetails.data.ingress ? striptags(formDetails.data.ingress) : '',
            formNumbers: forceArray(formDetails.data.formNumbers),
        }));

        return {
            title,
            sortTitle,
            ingress: content.data.ingress,
            audience: content.data.audience?._selected || 'all',
            keywords: forceArray((content as ContentWithMissingMixins).data.keywords),
            url: getUrl(content),
            type: content.type,
            targetLanguage: content.language || getLayersData().defaultLocale,
            anchorId: sanitize(sortTitle),
            illustration: content.data.illustration,
            area: forceArray(content.data.area),
            taxonomy,
            subItems,
        };
    };

import { Content } from '/lib/xp/content';
import { sanitize } from '/lib/xp/common';
import { forceArray } from '../../utils/array-utils';
import striptags from '/assets/striptags/3.1.1/src/striptags';
import { getPublicPath } from '../../paths/public-path';
import {
    ContentWithFormDetails,
    ContentWithTaxonomy,
    FormDetailsListItem,
    FormDetailsMap,
    ProductDataInFormsOverviewItem,
    Taxonomy,
} from './types';
import { FormDetailsSelector } from '@xp-types/site/mixins/form-details-selector';
import { ContentPageWithSidemenus } from '@xp-types/site/content-types/content-page-with-sidemenus';
import { getLayersData } from '../../localization/layers-data';

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
    const taxonomy = forceArray(content.data.taxonomy) as Taxonomy;

    return taxonomy;
};

export const getFormsOverviewListItemTransformer =
    (formDetailsMap: FormDetailsMap, overviewPageLanguage: string) =>
    (content: ContentWithFormDetails): FormDetailsListItem | null => {
        const formDetailsContents = forceArray(content.data.formDetailsTargets).reduce<
            Content<'no.nav.navno:form-details'>[]
        >((acc, formDetailsId) => {
            const formDetails = formDetailsMap[formDetailsId];
            if (formDetails) {
                acc.push(formDetails);
            }

            return acc;
        }, []);

        if (formDetailsContents.length === 0) {
            return null;
        }

        const title = content.data.title || content.displayName;
        const sortTitle = content.data.sortTitle || title;

        const taxonomy: Taxonomy = getTaxonomy(content) ?? null;

        return {
            title,
            sortTitle,
            ingress: content.data.ingress,
            keywords: forceArray((content as ContentWithMissingMixins).data.keywords),
            url: getUrl(content),
            type: content.type,
            targetLanguage: content.language || getLayersData().defaultLocale,
            anchorId: sanitize(sortTitle),
            illustration: content.data.illustration,
            area: forceArray(content.data.area),
            taxonomy,
            formDetailsPaths: formDetailsContents.map((formDetails) =>
                getPublicPath(formDetails, overviewPageLanguage)
            ),
            formDetailsTitles: formDetailsContents
                .map((formDetails) => formDetails.data.title)
                .filter(Boolean),
            formDetailsIngresses: formDetailsContents
                .map((formDetails) =>
                    formDetails.data.ingress ? striptags(formDetails.data.ingress) : ''
                )
                .filter(Boolean),
            formNumbers: formDetailsContents
                .map((formDetails) => forceArray(formDetails.data.formNumbers))
                .flat(),
        };
    };

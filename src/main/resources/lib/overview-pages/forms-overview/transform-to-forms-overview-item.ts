import { Content } from '/lib/xp/content';
import { sanitize } from '/lib/xp/common';
import { forceArray } from '../../utils/array-utils';
import striptags from '/assets/striptags/3.1.1/src/striptags';
import { getPublicPath } from '../../paths/public-path';
import {
    ContentWithFormDetails,
    FormDetailsListItem,
    FormDetailsMap,
    ProductDataInFormsOverviewItem,
} from './types';
import { FormDetailsSelector } from '../../../site/mixins/form-details-selector/form-details-selector';
import { ContentPageWithSidemenus } from '../../../site/content-types/content-page-with-sidemenus/content-page-with-sidemenus';

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

    return getPublicPath(content, content.language);
};

export const formsOverviewListItemTransformer =
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

        return {
            title,
            sortTitle,
            ingress: content.data.ingress,
            keywords: forceArray((content as ContentWithMissingMixins).data.keywords),
            url: getUrl(content),
            type: content.type,
            targetLanguage: content.language,
            anchorId: sanitize(sortTitle),
            illustration: content.data.illustration,
            area: forceArray(content.data.area),
            taxonomy: forceArray((content as ContentWithMissingMixins).data.taxonomy),
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

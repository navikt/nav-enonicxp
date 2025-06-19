import { Content } from '/lib/xp/content';
import { forceArray } from '../../utils/array-utils';
import { FormDetailsMap, OversiktListItem } from './types';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { getOversiktContent } from './helpers';
import { getLocalizedContentWithFallbackData } from '../common/localization';
import { logger } from '../../utils/logging';
import { getLayersData } from '../../localization/layers-data';

import * as contentLib from '/lib/xp/content';
import { ContentWithFormDetails } from './types';
import { Oversikt } from '@xp-types/site/content-types/oversikt';
import { getFormsOverviewListItemTransformer } from './transform-to-oversikt-item';

const buildFormDetailsDictionary = (
    contentWithFormDetails: ContentWithFormDetails[],
    oversiktType: Oversikt['oversiktType']
) => {
    const formDetailsIdsSet: Record<string, true> = {};

    contentWithFormDetails.forEach((content) => {
        forceArray(content.data.formDetailsTargets).forEach(
            (targetId) => (formDetailsIdsSet[targetId] = true)
        );
    }, []);

    const formDetailsIds = Object.keys(formDetailsIdsSet);

    const formDetailsContent = contentLib.query({
        count: formDetailsIds.length,
        contentTypes: ['no.nav.navno:form-details'],
        filters: {
            ids: {
                values: formDetailsIds,
            },
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.formType._selected',
                            values: [oversiktType],
                        },
                    },
                ],
            },
        },
    }).hits;

    return formDetailsContent.reduce<FormDetailsMap>((acc, formDetail) => {
        acc[formDetail._id] = formDetail;
        return acc;
    }, {});
};

export const buildFormDetailsList = (formsOverviewContent: Content<'no.nav.navno:oversikt'>) => {
    const { language, data, _id } = formsOverviewContent;
    const { oversiktType, audience, excludedContent, localeFallback } = data;
    logger.info('Running buildFormDetailsList')

    if (!audience?._selected) {
        logger.error(`Audience not set for overview page ${_id} (${language})`);
        return [];
    }

    const isTransportPage =
        audience._selected === 'provider' && audience.provider.pageType?._selected === 'links';

    if (isTransportPage) {
        return [];
    }

    if (!oversiktType || oversiktType === 'all_products') {
        logger.error(`Oversikt type invalid or not set for overview page ${_id} (${language})`);
        return [];
    }

    const contentWithFormDetails = getOversiktContent({
        oversiktType,
        audience,
        excludedContentIds: forceArray(excludedContent),
    });

    logger.info(JSON.stringify(contentWithFormDetails, null, 2))

    const locale = language || getLayersData().defaultLocale;

    const localizedContentWithFormDetails = getLocalizedContentWithFallbackData({
        contents: contentWithFormDetails,
        localeFallbackIds: forceArray(localeFallback),
        language: locale,
    });

    const formDetailsDictionary = buildFormDetailsDictionary(
        localizedContentWithFormDetails,
        oversiktType
    );

    const listItemTransformer = getFormsOverviewListItemTransformer(formDetailsDictionary, locale);
    logger.info(
        `localizedContentWithFormDetails length: ${localizedContentWithFormDetails.length}`
    );
    return localizedContentWithFormDetails
        .reduce<OversiktListItem[]>((acc, content) => {
            const transformedItem = listItemTransformer(content);
            if (transformedItem) {
                acc.push(transformedItem);
            }

            return acc;
        }, [])
        .sort(sortByLocaleCompareOnField('sortTitle'));
};

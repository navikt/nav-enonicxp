import { Content } from '/lib/xp/content';
import { runInContext } from '../../context/run-in-context';
import { sortByLocaleCompareOnField } from '../../utils/sort-utils';
import { logger } from '../../utils/logging';
import { getOversiktContent } from './helpers';
import { transformBasicOversiktItem } from './transform-to-oversikt-item';
import { forceArray } from '../../utils/array-utils';
import { getLocalizedContentWithFallbackData } from '../common/localization';
import { getLayersData } from '../../localization/layers-data';

export const buildBasicServicesList = (overviewContent: Content<'no.nav.navno:oversikt'>) => {
    const { data, language, _id } = overviewContent;
    const { oversiktType, audience, localeFallback, excludedContent } = data;

    if (!oversiktType || oversiktType !== 'all_products') {
        logger.error(`Type not set for overview page id ${_id}`);
        return [];
    }

    if (!audience) {
        logger.error(`Audience not set for overview page id ${_id}`);
        return [];
    }

    const listContents = getOversiktContent({
        oversiktType,
        audience,
        excludedContentIds: forceArray(excludedContent),
    });

    const locale = language || getLayersData().defaultLocale;

    const overviewList = runInContext({ branch: 'master' }, () => {
        const localizedContent = getLocalizedContentWithFallbackData({
            contents: listContents,
            localeFallbackIds: forceArray(localeFallback),
            language: locale,
        });

        return localizedContent.map((content) => transformBasicOversiktItem(content));
    });

    return overviewList.sort(sortByLocaleCompareOnField('title'));
};

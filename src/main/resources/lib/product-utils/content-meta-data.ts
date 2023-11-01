import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { NavNoDescriptor } from '../../types/common';
import { ContentWithResolvedData, getPageMetaOptionKey } from './product-content-data-types';

const PAGE_META_DESCRIPTOR: NavNoDescriptor<'page-meta'> = 'no.nav.navno:page-meta';

export const resolveContentMetaData = <Type extends ContentDescriptor>(
    content: Content
): ContentWithResolvedData<Type> => {
    const { data: contentData } = content;

    const pageMetaId = contentData.pageMetaTarget;
    if (!pageMetaId) {
        return contentData;
    }

    const pageMetaContent = contentLib.get({ key: pageMetaId });
    if (!pageMetaContent || pageMetaContent.type !== PAGE_META_DESCRIPTOR) {
        logger.critical(`No valid page-meta content found ${pageMetaContent?.type}`, true);
        return contentData;
    }

    const pageMetaKey = getPageMetaOptionKey(content.type);
    if (!pageMetaKey) {
        return contentData;
    }

    const { contentType: pageMetaOptions } = pageMetaContent.data;

    if (pageMetaOptions._selected !== pageMetaKey) {
        logger.critical(
            `Mismatched page-meta option selected on ${content._id}: Expected ${pageMetaKey}, got ${pageMetaOptions._selected}`,
            true
        );
        return contentData;
    }

    const pageMetaData = (pageMetaOptions as any)[pageMetaKey];
    if (!pageMetaData) {
        logger.critical(`No page-meta data found for ${pageMetaKey} on ${pageMetaData._id}`, true);
        return contentData;
    }

    return { ...contentData, ...pageMetaData };
};

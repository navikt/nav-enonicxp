import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../../types/common';
import { logger } from '../../utils/logging';
import { runGuillotineContentQuery } from '../queries/run-content-query';

export const resolveGuillotinePageMeta = (baseContent: Content, branch: RepoBranch) => {
    const metaDataRef = baseContent.data?.pageMetaTarget;
    if (!metaDataRef) {
        return null;
    }

    const metaContent = contentLib.get({ key: metaDataRef });
    if (!metaContent) {
        logger.error(`Invalid metadata ref on ${baseContent._id}`);
        return null;
    }

    if (metaContent.type !== 'no.nav.navno:page-meta') {
        logger.error(
            `Invalid content type for metadata on ${baseContent._id}: ${metaContent.type} ("metadata" id: ${metaContent._id})`
        );
        return null;
    }

    const metaContentResolved = runGuillotineContentQuery(metaContent, {
        branch,
        throwOnErrors: true,
        params: { ref: metaContent._id },
    });
    if (!metaContentResolved) {
        logger.error(
            `Failed to resolve metadata on ${baseContent._id}: ${metaContent.type} (${metaContent._id})`
        );
        return null;
    }

    const selected = metaContentResolved.data?.contentType?._selected;
    if (!selected) {
        logger.error(
            `No metadata was selected on target page-meta content ${metaContent._id} for base content ${baseContent._id}: `
        );
        return null;
    }

    return metaContentResolved.data.contentType[selected];
};

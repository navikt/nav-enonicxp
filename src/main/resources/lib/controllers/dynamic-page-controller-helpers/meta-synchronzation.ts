import * as portalLib from '/lib/xp/portal';
import { getRepoConnection } from '../../utils/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../../constants';
import { logger } from '../../utils/logging';
import { Content } from '/lib/xp/content';
import { NodeContent } from '/lib/xp/node';
import { getLayersData } from '../../localization/layers-data';

type DynamicPageContent = NodeContent<Content>;

const metaDataToCopy = [
    'audience',
    'illustration',
    'owner',
    'area',
    'managed-by',
    'taxonomy',
    'processing_times',
    'payout_dates',
    'rates',
    'formDetailsTargets',
    'feedbackToggle',
    'chatbotToggle',
    'hideFromProductlist',
];

export const synchronizeMetaDataToLayers = (req: XP.Request) => {
    // 1. Check if content is on default layer.
    // 2. If so, propagate meta to all layers
    // 2. If not, get the content from default layer, then copy to this one.
    // 5.

    const { repoIdToLocaleMap } = getLayersData();

    const content = portalLib.getContent();
    if (!content) {
        logger.error(`Could not get contextual content from request path - ${req.rawPath}`);
        return;
    }

    log.info(JSON.stringify(content));

    const defaultRepo = getRepoConnection({ repoId: CONTENT_ROOT_REPO_ID, branch: 'draft' });

    //const defaultLayerContent = defaultRepo.get<DynamicPageContent>({ key: content._id });
};

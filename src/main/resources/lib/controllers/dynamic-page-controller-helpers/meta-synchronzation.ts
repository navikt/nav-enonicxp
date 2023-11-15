import * as contentLib from '/lib/xp/content';

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
    // 1. Get the meta data to copy
    // 2. Loop each layer and check for divergent data
    // 3. Insert meta data into content
    log.info('synchronizeMetaDataToLayers');
};

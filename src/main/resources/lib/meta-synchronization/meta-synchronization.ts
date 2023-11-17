import * as contentLib from '/lib/xp/content';
import { getRepoConnection } from '../utils/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { logger } from '../utils/logging';
import { Content } from '/lib/xp/content';
import { NodeContent } from '/lib/xp/node';
import { getLayersData } from '../localization/layers-data';

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

type MetaData = { [key: string]: unknown };

const buildMetaDataObject = (content: DynamicPageContent): MetaData => {
    const metaData: MetaData = {};
    metaDataToCopy.forEach((key) => {
        if (content.data[key]) {
            metaData[key] = content.data[key];
        }
    });

    return metaData;
};

const syncToAllOtherLayers = (content: DynamicPageContent) => {
    log.info('copyToAllOtherLayers');
    const { repoIdToLocaleMap } = getLayersData();

    Object.keys(repoIdToLocaleMap).forEach((repoId) => {
        if (repoId === CONTENT_ROOT_REPO_ID) {
            return;
        }
        const draftRepo = getRepoConnection({ repoId, branch: 'draft' });
        const masterRepo = getRepoConnection({ repoId, branch: 'master' });
        const draftContent = draftRepo.get<DynamicPageContent>({ key: content._id });
        const masterContent = masterRepo.get<DynamicPageContent>({ key: content._id });

        const isContentPublished =
            masterContent && masterContent._versionKey === draftContent?._versionKey;

        if (!draftContent) {
            return;
        }

        const metaData = buildMetaDataObject(content);

        draftRepo.modify({
            key: draftContent._id,
            editor: (node) => {
                return { ...node, data: { ...node.data, metaData } };
            },
        });

        if (isContentPublished) {
            log.info(`Push to ${repoId} in master for ${content._id}`);
            draftRepo.push({
                keys: [draftContent._id],
                target: 'master',
            });
        }
    });
};

const updateFromDefaultLayer = (content: DynamicPageContent, repoId: string) => {
    log.info('copyFromDefaultLayer');
    const defaultRepo = getRepoConnection({ repoId: CONTENT_ROOT_REPO_ID, branch: 'draft' });
    const targetRepo = getRepoConnection({ repoId, branch: 'draft' });
    const defaultRepoContent = defaultRepo.get<DynamicPageContent>({ key: content._id });

    if (!defaultRepoContent) {
        logger.error(
            `Could not get content from default layer with id ${content._id} when trying to copy meta data`
        );
        return;
    }

    const metaData = buildMetaDataObject(defaultRepoContent);

    log.info(`copy to ${repoId}`);

    targetRepo.modify({
        key: content._id,
        editor: (node) => {
            return { ...node, data: { ...node.data, metaData } };
        },
    });
};

export const synchronizeMetaDataToLayers = (content: contentLib.Content, repo: string) => {
    const isContentInDefaultRepo = repo === CONTENT_ROOT_REPO_ID;

    log.info('synchronizeMetaDataToLayers');

    if (isContentInDefaultRepo) {
        syncToAllOtherLayers(content);
    } else {
        updateFromDefaultLayer(content, repo);
    }
};

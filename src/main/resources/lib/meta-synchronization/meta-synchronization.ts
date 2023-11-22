import * as contentLib from '/lib/xp/content';
import { getRepoConnection } from '../utils/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { logger } from '../utils/logging';
import { Content } from '/lib/xp/content';
import { NodeContent } from '/lib/xp/node';
import { getLayersData } from '../localization/layers-data';
import { getNodeVersions } from '../utils/version-utils';

type DynamicPageContent = NodeContent<Content>;

const metaDataToSync = [
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

const checkIfMetaIsChanged = (content: DynamicPageContent, previousContent: DynamicPageContent) => {
    const isMetaChanged = metaDataToSync.some((key) => {
        // Some meta data is stored as arrays or objects, and we need to compare them as JSON strings.
        // If the keys or array order has changed, we might get a false positive here.
        return JSON.stringify(content.data[key]) !== JSON.stringify(previousContent.data[key]);
    });

    return isMetaChanged;
};

const buildMetaDataObject = (content: DynamicPageContent): MetaData => {
    const metaData = metaDataToSync.reduce((acc, key) => {
        return content.data[key] ? { ...acc, [key]: content.data[key] } : acc;
    }, {} as MetaData);

    return metaData;
};

const syncToAllOtherLayers = (content: DynamicPageContent) => {
    const { repoIdToLocaleMap } = getLayersData();

    // Check previous version of content for change.
    const versions = getNodeVersions({
        nodeKey: content._id,
        repoId: CONTENT_ROOT_REPO_ID,
        branch: 'master',
    });
    const previousVersionId = versions[1]?.versionId;
    const previousContentVersion =
        previousVersionId &&
        contentLib.get({
            key: content._id,
            versionId: previousVersionId,
        });

    const isMetaChanged = !!(
        previousContentVersion && checkIfMetaIsChanged(content, previousContentVersion)
    );

    if (!isMetaChanged) {
        logger.info(
            'metasync: No meta data changes detected in this default layer, skipping further synchronization'
        );
    }

    const metaData = buildMetaDataObject(content);
    logger.info(`metasync: new metadata from default layer: ${JSON.stringify(metaData)}`);

    Object.keys(repoIdToLocaleMap).forEach((repoId) => {
        if (repoId === CONTENT_ROOT_REPO_ID) {
            return;
        }

        // Get the draft and master repo and content in order to check
        // for versionKey later.
        const draftRepo = getRepoConnection({ repoId, branch: 'draft' });
        const masterRepo = getRepoConnection({ repoId, branch: 'master' });
        const draftContent = draftRepo.get<DynamicPageContent>({ key: content._id });
        const masterContent = masterRepo.get<DynamicPageContent>({ key: content._id });

        if (!draftContent) {
            return;
        }

        const isPublished = masterContent && masterContent._versionKey === draftContent._versionKey;

        draftRepo.modify({
            key: draftContent._id,
            editor: (node) => {
                return { ...node, data: { ...node.data, ...metaData } };
            },
        });

        if (isPublished) {
            logger.info('metasync: content was previously published, pushing to master');
            draftRepo.push({
                keys: [draftContent._id],
                target: 'master',
            });
        }
    });
};

const updateFromDefaultLayer = (content: DynamicPageContent, repoId: string) => {
    const defaultRepo = getRepoConnection({ repoId: CONTENT_ROOT_REPO_ID, branch: 'draft' });
    const currentRepo = getRepoConnection({ repoId, branch: 'draft' });
    const defaultRepoContent = defaultRepo.get<DynamicPageContent>({ key: content._id });

    if (!defaultRepoContent) {
        logger.error(
            `metasync: Could not get content from default layer with id ${content._id} when trying to copy meta data`
        );
        return;
    }

    const hasMetaDataChanged = checkIfMetaIsChanged(content, defaultRepoContent);

    if (!hasMetaDataChanged) {
        logger.info(
            `metasync: No meta data changes detected in this layer ${repoId}, skipping further synchronization`
        );
        return;
    }

    const metaData = buildMetaDataObject(defaultRepoContent);
    logger.info(`metasync: new metadata: ${JSON.stringify(metaData)}`);
    logger.info(`currentRepo: ${JSON.stringify(currentRepo)}`);

    currentRepo.modify({
        key: content._id,
        editor: (node) => {
            return { ...node, data: { ...node.data, ...metaData } };
        },
    });

    // As this function was triggered by a push event on the current repo,
    // it's safe to assume that the content can be re-pushed without
    // further checks.
    currentRepo.push({
        keys: [content._id],
        target: 'master',
    });
};

const checkChangeFromLastVersion = (content: DynamicPageContent, repoId: string) => {};

export const synchronizeMetaDataToLayers = (content: contentLib.Content, repo: string) => {
    const isDefaultLayer = repo === CONTENT_ROOT_REPO_ID;

    if (isDefaultLayer) {
        logger.info('metasync: is default layer, sync to all other layers');
        syncToAllOtherLayers(content);
    } else {
        logger.info(`metasync: is not default repo ${repo}`);
        updateFromDefaultLayer(content, repo);
    }
};

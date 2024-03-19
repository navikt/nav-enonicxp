import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../utils/repo-utils';
import { runInContext } from '../context/run-in-context';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { logger } from '../utils/logging';
import { getLayersData } from '../localization/layers-data';
import { getNodeVersions } from '../utils/version-utils';
import { isContentLocalized } from '../localization/locale-utils';
import { ContentNode } from '../../types/content-types/content-config';

type DynamicPageContent = ContentNode<any> | Content<any>;

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
    'chatbotToggle',
    'hideFromProductlist',
];

type MetaData = { [key: string]: unknown };

const checkIfMetaHasBeenEdited = (
    content: DynamicPageContent,
    previousContent: DynamicPageContent
) => {
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

const attemptDraftUpdate = (
    draftContent: DynamicPageContent,
    repoId: string,
    metaData: MetaData
) => {
    runInContext({ repository: repoId, asAdmin: true }, () => {
        try {
            contentLib.modify({
                key: draftContent._id,
                requireValid: false,
                editor: (content) => {
                    content.data = { ...content.data, ...metaData };
                    return content;
                },
            });
        } catch (e) {
            logger.error(
                `Meta synchronization: Could not modify content with id ${
                    draftContent._id
                } on repoId ${repoId}: ${JSON.stringify(e)}`
            );
            return;
        }
    });
};

const attemptPublish = (contentId: string, repoId: string) => {
    runInContext({ repository: repoId, asAdmin: true }, () => {
        try {
            contentLib.publish({
                keys: [contentId],
                sourceBranch: 'draft',
                targetBranch: 'master',
            });
        } catch (e) {
            logger.error(
                `Meta synchronization: Could not publish content with id ${contentId} on repoId ${repoId}: ${JSON.stringify(
                    e
                )}`
            );
            return;
        }
    });
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

    const hasMetaBeenEdited = !!(
        previousContentVersion && checkIfMetaHasBeenEdited(content, previousContentVersion)
    );

    if (!hasMetaBeenEdited) {
        return;
    }

    const metaData = buildMetaDataObject(content);

    logger.info(
        `Meta synchronization: Meta data in default repo and content ${content._id} was updated, so synching and publishing to all other layers.`
    );

    Object.keys(repoIdToLocaleMap).forEach((repoId) => {
        if (repoId === CONTENT_ROOT_REPO_ID) {
            return;
        }

        // Get the draft and master repo and content in order to check
        // for versionKey later.
        const draftRepo = getRepoConnection({ repoId, branch: 'draft', asAdmin: true });
        const masterRepo = getRepoConnection({ repoId, branch: 'master', asAdmin: true });
        const draftContent = draftRepo.get<DynamicPageContent>({ key: content._id });
        const masterContent = masterRepo.get<DynamicPageContent>({ key: content._id });

        if (!draftContent) {
            logger.error(
                `Meta synchronization: Could not get content from ${repoId} layer with id ${content._id} when trying to copy meta data`
            );
            return;
        }

        if (!isContentLocalized(draftContent)) {
            return;
        }

        const isPublished = masterContent && masterContent._versionKey === draftContent._versionKey;

        attemptDraftUpdate(draftContent, repoId, metaData);

        if (isPublished) {
            attemptPublish(draftContent._id, repoId);
        }
    });
};

const updateFromDefaultLayer = (currentContent: DynamicPageContent, repoId: string) => {
    const defaultRepo = getRepoConnection({
        repoId: CONTENT_ROOT_REPO_ID,
        branch: 'draft',
        asAdmin: true,
    });
    const originContent = defaultRepo.get<DynamicPageContent>({ key: currentContent._id });

    if (!originContent) {
        logger.error(
            `Meta synchronization: Could not get content from default layer with id ${currentContent._id} when trying to copy meta data`
        );
        return;
    }

    if (!checkIfMetaHasBeenEdited(currentContent, originContent)) {
        return;
    }

    const metaData = buildMetaDataObject(originContent);

    logger.info(
        `Meta synchronization: Meta data in ${repoId} and content ${currentContent._id} was changed, so re-synching meta data from default layer.`
    );
    attemptDraftUpdate(currentContent, repoId, metaData);

    // As this function was triggered by a push event on the current repo,
    // it's safe to assume that the content can be re-pushed without
    // further checks.
    attemptPublish(currentContent._id, repoId);
};

export const synchronizeMetaDataToLayers = (content: contentLib.Content, repo: string) => {
    const isDefaultLayer = repo === CONTENT_ROOT_REPO_ID;

    if (isDefaultLayer) {
        syncToAllOtherLayers(content);
    } else {
        updateFromDefaultLayer(content, repo);
    }
};

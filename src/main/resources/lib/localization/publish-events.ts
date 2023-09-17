import * as eventLib from '/lib/xp/event';
import { EnonicEvent, EnonicEventData } from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import { getRepoConnection } from '../utils/repo-utils';
import { logger } from '../utils/logging';
import { getContentFromAllLayers, isContentLocalized } from './locale-utils';
import { CONTENT_REPO_PREFIX, CONTENT_ROOT_REPO_ID } from '../constants';

let hasSetupListeners = false;

type NodeData = EnonicEventData['nodes'][number];

const pushToMaster = (contentId: string, repoId: string) => {
    const result = getRepoConnection({ branch: 'draft', repoId, asAdmin: true }).push({
        key: contentId,
        target: 'master',
        resolve: false,
        includeChildren: false,
    });

    logger.info(`Pushed ${contentId} to master in ${repoId} - result: ${JSON.stringify(result)}`);
};

// Handles the case where content may have already been published in the root repo
// by the time the layer update event is fired. This will usually only happen when content
// is programmatically updated and immediately published. In this case, the node.pushed
// handler for the root repo may have been triggered before the content was synced to
// the layers.
const pushToMasterIfContentIsPublishedInRootRepo = ({ id, repo, branch }: NodeData) => {
    // For content updated in the root repo, we don't do anything
    if (branch !== 'draft' || repo === CONTENT_ROOT_REPO_ID) {
        return;
    }

    const layerContentDraft = getRepoConnection({
        repoId: repo,
        branch: 'draft',
        asAdmin: true,
    }).get(id);

    // For content which is localized, no action is needed
    if (!layerContentDraft || isContentLocalized(layerContentDraft)) {
        return;
    }

    const rootContentMaster = getRepoConnection({
        repoId: CONTENT_ROOT_REPO_ID,
        branch: 'master',
    }).get(id);

    // We only want to push the layer content if it has an equal or newer timestamp, compared
    // to the root master content. Layer content will "always" have a higher timestamp for
    // the same version, as it is updated after the root content is saved.
    if (!rootContentMaster || rootContentMaster._ts > layerContentDraft._ts) {
        return;
    }

    logger.info(`Pushing newest version of ${id} in ${repo} to master`);

    pushToMaster(id, repo);
};

// Publish/unpublish actions in the root layer should be propagated to non-localized content in
// child layers, as XP does not do this automatically
const propagatePublishEventsToLayers = (event: EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        const { id, branch, repo } = node;

        if (!repo.startsWith(CONTENT_REPO_PREFIX)) {
            return;
        }

        if (event.type === 'node.updated') {
            return pushToMasterIfContentIsPublishedInRootRepo(node);
        }

        if (branch !== 'master' || repo !== CONTENT_ROOT_REPO_ID) {
            return;
        }

        const nonlocalized = getContentFromAllLayers({
            contentId: id,
            branch: 'draft',
            state: 'nonlocalized',
        });

        nonlocalized.forEach(({ repoId, locale }) => {
            if (repoId === CONTENT_ROOT_REPO_ID) {
                return;
            }

            if (event.type === 'node.pushed') {
                pushToMaster(id, repoId);
            } else if (event.type === 'node.deleted') {
                const result = getRepoConnection({
                    branch: 'master',
                    repoId,
                    asAdmin: true,
                }).delete(id);

                logger.info(
                    `Deleted ${id} from master in ${repoId} - result: ${JSON.stringify(result)}`
                );
            }
        });
    });
};

export const activateLayersEventListeners = () => {
    if (hasSetupListeners) {
        logger.error('Localization event listeners were already setup');
        return;
    }

    hasSetupListeners = true;

    eventLib.listener({
        type: '(node.pushed|node.deleted|node.updated)',
        localOnly: false,
        callback: propagatePublishEventsToLayers,
    });
};

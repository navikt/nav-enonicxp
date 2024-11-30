import * as eventLib from '/lib/xp/event';
import * as taskLib from '/lib/xp/task';
import { CONTENT_ROOT_PATH } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { CONTENT_ROOT_REPO_ID, URLS } from '../constants';
import { getLayersData } from '../localization/layers-data';
import { getExternalSearchConfig, revalidateExternalSearchConfigCache } from './config';
import { updateExternalSearchDocumentForContent } from './update-one';
import { updateExternalSearchDocumentsForAllReferences } from './update-references';
import { isMainDatanode } from '../cluster-utils/main-datanode';
import { updateSearchMetatagsPressNews } from './document-builder/field-resolvers/metatags';

let isActive = false;

const runSearchDocumentUpdateTask = (contentId: string, repoId: string) => {
    taskLib.executeFunction({
        description: `Update external search index for ${contentId} in ${repoId}`,
        func: () => {
            try {
                updateExternalSearchDocumentForContent(contentId, repoId);
                updateExternalSearchDocumentsForAllReferences(contentId, repoId);
            } catch (e) {
                logger.critical(
                    `Error while running search index update for ${contentId} in ${repoId} - ${e}`
                );
            }
        },
    });
};

export const activateExternalSearchIndexEventHandlers = () => {
    if (!app.config.searchApiKey) {
        logger.info('No search api key set for current environment - content will not be indexed');
        return;
    }

    if (!URLS.SEARCH_API_URL) {
        logger.info('No search api url set for current environment - content will not be indexed');
        return;
    }

    if (isActive) {
        logger.error(
            `Attempted to activate search index event handlers, but handlers were already active!`
        );
        return;
    }

    isActive = true;

    revalidateExternalSearchConfigCache();
    updateSearchMetatagsPressNews();

    eventLib.listener({
        type: '(node.pushed|node.deleted)',
        callback: (event) => {
            const searchConfig = getExternalSearchConfig();
            if (!searchConfig) {
                logger.critical(`No search config found - could not run event handler!`);
                return;
            }

            event.data.nodes.forEach((nodeData) => {
                const { repoIdToLocaleMap } = getLayersData();

                if (
                    nodeData.branch !== 'master' ||
                    !nodeData.path.startsWith(CONTENT_ROOT_PATH) ||
                    !repoIdToLocaleMap[nodeData.repo]
                ) {
                    return;
                }

                if (nodeData.repo === CONTENT_ROOT_REPO_ID && nodeData.id === searchConfig._id) {
                    revalidateExternalSearchConfigCache();
                    return;
                }

                updateSearchMetatagsPressNews(nodeData.id);

                if (!isMainDatanode()) {
                    return;
                }

                runSearchDocumentUpdateTask(nodeData.id, nodeData.repo);
            });
        },
        localOnly: false,
    });

    logger.info('Started event listener for external search index updates');
};

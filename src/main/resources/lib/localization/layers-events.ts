import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import * as nodeLib from '/lib/xp/node';
import { logger } from '../utils/logging';
import { getLayersData } from './layers-data';
import { removeDuplicates } from '../utils/nav-utils';
import { hasValidCustomPath } from '../custom-paths/custom-paths';
import { buildLocalePath, getContentFromAllLayers } from './locale-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';

let hasSetupListeners = false;

const isLocalized = (content: any) => content.data.isProcessedForLocalization;
const setIsLocalized = (content: any) => (content.data.isProcessedForLocalization = true);

// This is not in use... and may never be
// Depending on how we decide to handle localized urls, this may be removed. The current
// implementation does not explicitly set localized urls in locale layers, but instead resolved
// urls with locale suffixes to content from the matching layer
const processContentOnLocalization = (event: EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }

    const { defaultLocale, repoIdToLocaleMap } = getLayersData();

    removeDuplicates(event.data.nodes, (a, b) => a.id === b.id).forEach((node) => {
        const { id, branch, repo } = node;
        if (branch !== 'draft') {
            return;
        }

        const locale = repoIdToLocaleMap[repo];

        if (!locale) {
            logger.info(`Repo ${repo} does not contain a layer`);
            return;
        }

        if (locale === defaultLocale) {
            logger.info(`Repo ${repo} contains the default layer`);
            return;
        }

        const repoConnection = nodeLib.connect({
            branch: 'draft',
            repoId: repo,
            user: {
                login: 'su',
            },
            principals: ['role:system.admin'],
        });

        const content = repoConnection.get(id);
        if (!content) {
            logger.info(`Content ${id} was not found in draft branch of repo ${repo}!`);
            return;
        }

        if (repo.endsWith(content.originProject)) {
            logger.info(`Content ${id} originated in this repo (${repo})`);
            return;
        }

        if (isLocalized(content)) {
            logger.info(`Content ${id} was already processed in this repo (${repo})`);
            return;
        }

        const result = repoConnection.modify({
            key: id,
            editor: (content) => {
                setIsLocalized(content);

                if (!hasValidCustomPath(content)) {
                    return content;
                }

                logger.info(`Content ${id} has a customPath set, modifying...`);
                const { customPath } = content.data;
                const newPath = buildLocalePath(customPath, locale);

                if (newPath === customPath) {
                    logger.info(`Localized custom path was already set`);
                    return content;
                }

                content.data.customPath = newPath;

                return content;
            },
        });

        logger.info(`Modify result: ${JSON.stringify(result)}`);
    });
};

// Publish/unpublish actions in the root layer should be propagated to non-localized content in child
// layers, as XP does not do this automatically
const propagatePublishEventsToLayers = (event: EnonicEvent) => {
    if (!clusterLib.isMaster()) {
        return;
    }

    removeDuplicates(event.data.nodes, (a, b) => a.id === b.id).forEach((node) => {
        const { id, branch, repo } = node;

        if (branch !== 'master' || repo !== CONTENT_ROOT_REPO_ID) {
            return;
        }

        const nonLocalizedContent = getContentFromAllLayers(id, branch, 'nonlocalized');

        nonLocalizedContent.forEach(({ repoId, locale }) => {
            if (repoId === CONTENT_ROOT_REPO_ID) {
                return;
            }

            if (event.type === 'node.pushed') {
                logger.info(`Pushing ${id} to master in layer ${locale}`);
                const repoConnection = nodeLib.connect({
                    repoId,
                    branch: 'draft',
                    user: {
                        login: 'su',
                    },
                    principals: ['role:system.admin'],
                });

                repoConnection.push({ key: id, target: 'master', resolve: false });
            } else if (event.type === 'node.deleted') {
                logger.info(`Deleting ${id} from master in layer ${locale}`);
                const repoConnection = nodeLib.connect({
                    repoId,
                    branch: 'master',
                    user: {
                        login: 'su',
                    },
                    principals: ['role:system.admin'],
                });

                repoConnection.delete(id);
            }
        });
    });
};

export const activateLayersEventListeners = () => {
    if (hasSetupListeners) {
        logger.error('Localization event listeners were already setup');
        return;
    }

    eventLib.listener({
        type: '(node.pushed|node.deleted)',
        localOnly: false,
        callback: propagatePublishEventsToLayers,
    });

    hasSetupListeners = true;
};

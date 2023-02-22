import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import * as nodeLib from '/lib/xp/node';
import { logger } from '../utils/logging';
import { getLayersData } from './layers-data';
import { removeDuplicates } from '../utils/nav-utils';
import { hasValidCustomPath } from '../custom-paths/custom-paths';
import { buildLocalePath } from './locale-utils';

let hasSetupListeners = false;

const isLocalized = (content: any) => content.data.isProcessedForLocalization;
const setIsLocalized = (content: any) => (content.data.isProcessedForLocalization = true);

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

// This is not in use... and may never be
// Depending on how we decide to handle localized urls, this may be removed. The current
// implementation does not explicitly set localized urls in locale layers, but instead resolved
// urls with locale suffixes to content from the matching layer
export const activateLocalizationEventListeners = () => {
    if (hasSetupListeners) {
        logger.error('Localization event listeners were already setup');
        return;
    }

    eventLib.listener({
        type: 'node.updated',
        localOnly: false,
        callback: processContentOnLocalization,
    });

    hasSetupListeners = true;
};
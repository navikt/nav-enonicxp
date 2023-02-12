import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import * as nodeLib from '/lib/xp/node';
import { logger } from '../utils/logging';
import { getLayersData } from './layers-data';
import { removeDuplicates } from '../utils/nav-utils';
import { hasValidCustomPath } from '../custom-paths/custom-paths';

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
                const newPathSuffix = `/${locale}`;

                if (customPath.endsWith(newPathSuffix)) {
                    logger.info(`Localized custom path was already set`);
                    return content;
                }

                content.data.customPath = customPath.replace(/(\/)?$/, newPathSuffix);

                return content;
            },
        });

        logger.info(`Modify result: ${JSON.stringify(result)}`);
    });
};

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

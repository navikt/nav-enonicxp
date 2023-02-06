import { Locale, RepoBranch } from '../../types/common';
import * as nodeLib from '/lib/xp/node';
import { stripPathPrefix } from '../utils/nav-utils';
import { getLayersData } from './layers-data';
import { logger } from '../utils/logging';

export const getLayersMultiConnection = (branch: RepoBranch) => {
    return nodeLib.multiRepoConnect({
        sources: getLayersData().sources[branch],
    });
};

export const getLayeredNodesFromPath = ({
    idOrPath,
    branch,
}: {
    idOrPath: string;
    branch: RepoBranch;
}) => {
    const foundNodes = getLayersMultiConnection(branch).query({
        start: 0,
        count: 1000,
        filters: {
            boolean: {
                should: [
                    {
                        hasValue: {
                            field: '_path',
                            values: [`/content${idOrPath}`],
                        },
                    },
                    {
                        hasValue: {
                            field: 'data.customPath',
                            values: [stripPathPrefix(idOrPath)],
                        },
                    },
                ],
                mustNot: [
                    {
                        hasValue: {
                            field: 'inherit',
                            values: ['CONTENT'],
                        },
                    },
                ],
            },
        },
    });

    return foundNodes.hits;
};

export const getLocaleFromPath = ({
    idOrPath,
    branch,
}: {
    idOrPath: string;
    branch: RepoBranch;
}): Locale => {
    const { defaultLocale, repoIdToLocaleMap } = getLayersData();

    const foundNodes = getLayeredNodesFromPath({ idOrPath, branch });
    if (foundNodes.length === 0) {
        logger.info(`Content ${idOrPath} not found in any layer`);
        return defaultLocale;
    }

    if (foundNodes.length > 1) {
        logger.error(
            `Content ${idOrPath} found in multiple layers, returning default - ${foundNodes.map(
                (node) => node.repoId
            )}`
        );
        return defaultLocale;
    }

    const { repoId } = foundNodes[0];

    const locale = repoIdToLocaleMap[repoId];
    if (!locale) {
        // This should not be possible!
        logger.critical(
            `Content ${idOrPath} found in repo ${repoId} for but no locale was found for this repo!`
        );
        return defaultLocale;
    }

    return locale;
};

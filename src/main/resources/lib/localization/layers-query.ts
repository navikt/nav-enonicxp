import { Locale, RepoBranch } from '../../types/common';
import * as nodeLib from '/lib/xp/node';
import { stripPathPrefix } from '../utils/nav-utils';
import { getLayersData, isValidLocale } from './layers-data';
import { logger } from '../utils/logging';
import { runInLocaleContext } from './context';
import * as contentLib from '/lib/xp/content';
import { contentRootRepoId } from '../constants';
import { MultiRepoNodeQueryHit } from '/lib/xp/node';
import { Content } from '/lib/xp/content';

export const getLayersMultiConnection = (branch: RepoBranch) => {
    return nodeLib.multiRepoConnect({
        sources: getLayersData().sources[branch],
    });
};

const getPathQueryParams = (path: string) => ({
    start: 0,
    count: 100,
    sort: 'createdTime ASC',
    filters: {
        boolean: {
            should: [
                {
                    hasValue: {
                        field: '_path',
                        values: [`/content${path}`],
                    },
                },
                {
                    hasValue: {
                        field: 'data.customPath',
                        values: [stripPathPrefix(path)],
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

const getLayeredNodesFromPath = ({ path, branch }: { path: string; branch: RepoBranch }) => {
    const foundNodes = getLayersMultiConnection(branch).query(getPathQueryParams(path));

    return foundNodes.hits;
};

type ContentPathTarget = {
    content: Content;
    locale: Locale;
};

const resolveExactPath = (
    foundNodes: ReadonlyArray<MultiRepoNodeQueryHit>,
    path: string
): ContentPathTarget | null => {
    const { defaultLocale, repoIdToLocaleMap } = getLayersData();

    if (foundNodes.length > 1) {
        const defaultNode = foundNodes.find((node) => node.repoId === contentRootRepoId);
        if (defaultNode) {
            logger.info(`Content ${path} found in multiple layers, returning default`);
            const content = contentLib.get({ key: defaultNode.id });
            if (!content) {
                return null;
            }

            return { content, locale: defaultLocale };
        }

        logger.info(
            `Content ${path} found in multiple layers, but not in default! returning oldest`
        );

        return null;
    }

    const { id, repoId } = foundNodes[0];

    const locale = repoIdToLocaleMap[repoId];
    // This should not be possible!
    if (!locale) {
        logger.critical(
            `Content for path ${path} found in repo ${repoId} for but no locale was found for this repo!`
        );
    }

    const content = runInLocaleContext({ locale }, () => contentLib.get({ key: id }));

    return content ? { content, locale } : null;
};

const resolveLocaleSuffixedPath = (path: string, branch: RepoBranch): ContentPathTarget | null => {
    const { defaultLocale } = getLayersData();

    const pathSegments = path.split('/');
    const possibleLocale = pathSegments.pop();

    if (possibleLocale === defaultLocale || !isValidLocale(possibleLocale)) {
        logger.info(`Not a valid locale suffix: ${possibleLocale}`);
        return null;
    }

    const possiblePath = pathSegments.join('/');

    const localeContent = runInLocaleContext({ locale: possibleLocale, branch }, () =>
        contentLib.query(getPathQueryParams(possiblePath))
    ).hits;

    if (localeContent.length === 0) {
        logger.info(`Content ${possiblePath} not found in any layer`);
        return null;
    }

    if (localeContent.length > 1) {
        logger.error(`Multiple hits for ${possiblePath}!`);
    }

    logger.info(`Content ${possiblePath} found with locale ${possibleLocale}`);
    return { content: localeContent[0], locale: possibleLocale };
};

export const resolvePathToTarget = ({
    path,
    branch,
}: {
    path: string;
    branch: RepoBranch;
}): ContentPathTarget | null => {
    const foundNodes = getLayeredNodesFromPath({ path, branch });

    return foundNodes.length > 0
        ? resolveExactPath(foundNodes, path)
        : resolveLocaleSuffixedPath(path, branch);
};

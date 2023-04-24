import * as projectLib from '/lib/xp/project';
import { Project } from '/lib/xp/project';
import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import { getRepoConnection } from '../utils/repo-utils';
import { SourceWithPrincipals, PrincipalKey } from '/lib/xp/node';
import { runInContext } from '../context/run-in-context';
import { logger } from '../utils/logging';
import {
    CONTENT_ROOT_REPO_ID,
    CONTENT_REPO_PREFIX,
    CONTENT_ROOT_PROJECT_ID,
    CONTENT_LOCALE_DEFAULT,
} from '../constants';
import { batchedNodeQuery } from '../utils/batched-query';
import { toggleCacheInvalidationOnNodeEvents } from '../cache/invalidate-event-defer';

type LocaleToRepoIdMap = Record<string, string>;
type RepoIdToLocaleMap = Record<string, string>;

type LayersRepoData = {
    defaultLocale: string;
    localeToRepoIdMap: LocaleToRepoIdMap;
    repoIdToLocaleMap: RepoIdToLocaleMap;
    sources: {
        master: SourceWithPrincipals[];
        draft: SourceWithPrincipals[];
    };
    locales: string[];
};

const data: LayersRepoData = {
    defaultLocale: CONTENT_LOCALE_DEFAULT,
    localeToRepoIdMap: {},
    repoIdToLocaleMap: {},
    sources: {
        master: [],
        draft: [],
    },
    locales: [],
};

const THIRTY_MIN_MS = 1000 * 60 * 30;

export const isValidLocale = (locale?: string): locale is string =>
    !!(locale && data.localeToRepoIdMap[locale]);

export const getLocaleFromRepoId = (repoId: string) => data.repoIdToLocaleMap[repoId];

export const getLayersData = () => data;

const contentOnlyQueryParams = {
    query: '_path LIKE "/content/*"'
};

// Pushes any nodes which exists on master in the root project to master on
// the child layers as well.
//
// We do this programatically, as content studio tends to crash when publishing
// a very large number of nodes in one action, and to avoid confusing editor staff
// with an apparent large number of publish dependencies when localizing content
export const pushLayerContentToMaster = (pushMissingOnly: boolean) => {
    logger.info('Starting job to publish layer content to master');

    refreshLayersData();

    const nodeIdsInRootRepoMaster = batchedNodeQuery({
        repoParams: { repoId: CONTENT_ROOT_REPO_ID, branch: 'master' },
        queryParams: contentOnlyQueryParams,
    }).hits.map((hit) => hit.id);

    logger.info(`Found ${nodeIdsInRootRepoMaster.length} nodes in root repo`);

    toggleCacheInvalidationOnNodeEvents({ shouldDefer: true, maxDeferTime: THIRTY_MIN_MS });

    Object.values(data.localeToRepoIdMap).forEach((repoId) => {
        if (repoId === CONTENT_ROOT_REPO_ID) {
            return;
        }

        const existingNodesSet = batchedNodeQuery({
            repoParams: { repoId: repoId, branch: 'master' },
            queryParams: contentOnlyQueryParams,
        }).hits.reduce<Record<string, true>>((acc, hit) => {
            acc[hit.id] = true;
            return acc;
        }, {});

        const nodesToPush = pushMissingOnly
            ? nodeIdsInRootRepoMaster.filter((id) => !existingNodesSet[id])
            : nodeIdsInRootRepoMaster;
        if (nodesToPush.length === 0) {
            logger.info(`No missing nodes found for ${repoId}`);
            return;
        }

        logger.info(`Pushing ${nodesToPush.length} to master in layer repo ${repoId}`);

        const repoConnection = getRepoConnection({
            repoId: repoId,
            branch: 'draft',
            asAdmin: true,
        });

        try {
            const result = repoConnection.push({
                keys: nodesToPush,
                target: 'master',
                resolve: false,
            });

            logger.info(
                `Result for ${repoId} // Success: (${result.success.length}) - Failed: (${
                    result.failed.length
                }) ${JSON.stringify(result.failed)}`
            );
        } catch (e) {
            logger.error(`Error while pushing layer content to master in ${repoId} - ${e}`);
        }
    });

    toggleCacheInvalidationOnNodeEvents({ shouldDefer: false });

    logger.info('Finished job to publish layer content to master!');
};

const populateWithChildLayers = (
    projects: readonly Project[],
    localeToRepoIdMap: LocaleToRepoIdMap,
    parentId: string
) => {
    projects.forEach((project) => {
        const { parent, id, language } = project;
        if (parent !== parentId || !language) {
            return;
        }

        if (localeToRepoIdMap[language]) {
            logger.error(`Layer was already specified for locale ${language}`);
        } else {
            localeToRepoIdMap[language] = `${CONTENT_REPO_PREFIX}.${id}`;
        }

        populateWithChildLayers(projects, localeToRepoIdMap, id);
    });
};

const refreshLayersData = () => {
    const projects = runInContext({ asAdmin: true }, () => projectLib.list());

    const localeToRepoIdMap: LocaleToRepoIdMap = {};

    const rootProject = projects.find((project) => project.id === CONTENT_ROOT_PROJECT_ID);
    if (!rootProject) {
        logger.critical('No root project found!');
        return;
    }

    if (!rootProject.language) {
        logger.critical(
            `Root project has no language set - Using default language ${CONTENT_LOCALE_DEFAULT}`
        );
    } else if (rootProject.language !== CONTENT_LOCALE_DEFAULT) {
        logger.critical(
            `Root project did not have the expected language - Expected ${CONTENT_LOCALE_DEFAULT}, got ${rootProject.language}`
        );
    }

    const { language: rootLanguage = CONTENT_LOCALE_DEFAULT } = rootProject;

    localeToRepoIdMap[rootLanguage] = CONTENT_ROOT_REPO_ID;

    populateWithChildLayers(projects, localeToRepoIdMap, CONTENT_ROOT_PROJECT_ID);

    const localeToRepoIdMapEntries = Object.entries(localeToRepoIdMap);

    data.defaultLocale = rootLanguage;
    data.localeToRepoIdMap = localeToRepoIdMap;
    data.repoIdToLocaleMap = localeToRepoIdMapEntries.reduce((acc, [locale, repoId]) => {
        return { ...acc, [repoId]: locale };
    }, {} as RepoIdToLocaleMap);
    data.sources.master = localeToRepoIdMapEntries.map(([_, repoId]) => {
        return { repoId, branch: 'master', principals: ['role:system.admin'] as PrincipalKey[] };
    });
    data.sources.draft = localeToRepoIdMapEntries.map(([_, repoId]) => {
        return { repoId, branch: 'draft', principals: ['role:system.admin'] as PrincipalKey[] };
    });
    data.locales = Object.keys(localeToRepoIdMap);

    logger.info(`Content layers: ${JSON.stringify(data.localeToRepoIdMap)}`);
};

let hasSetupListeners = false;

export const initLayersData = () => {
    refreshLayersData();

    if (hasSetupListeners) {
        return;
    }

    logger.info('Activating event listener for content layers');
    hasSetupListeners = true;

    eventLib.listener({
        type: '(repository.updated|repository.deleted)',
        localOnly: false,
        callback: (event: EnonicEvent<{ id?: string }>) => {
            if (!event.data?.id?.startsWith(CONTENT_REPO_PREFIX)) {
                return;
            }
            logger.info(
                `Content repository event triggered, refreshing content layers map - Event: ${JSON.stringify(
                    event
                )}`
            );
            refreshLayersData();
        },
    });
};

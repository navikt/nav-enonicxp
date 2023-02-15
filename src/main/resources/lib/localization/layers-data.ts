import * as projectLib from '/lib/xp/project';
import { Project } from '/lib/xp/project';
import * as eventLib from '/lib/xp/event';
import { EnonicEvent } from '/lib/xp/event';
import * as nodeLib from '/lib/xp/node';
import { SourceWithPrincipals, PrincipalKey } from '/lib/xp/node';
import { runInContext } from '../context/run-in-context';
import { logger } from '../utils/logging';
import { contentRootRepoId, contentRepoPrefix, contentRootProjectId } from '../constants';
import { batchedNodeQuery } from '../utils/batched-query';
import { toggleCacheInvalidationOnNodeEvents } from '../cache/invalidate-event-handlers';

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
};

const data: LayersRepoData = {
    defaultLocale: 'no',
    localeToRepoIdMap: {},
    repoIdToLocaleMap: {},
    sources: {
        master: [],
        draft: [],
    },
};

const fifteenMinutesMs = 1000 * 60 * 15;

export const isValidLocale = (locale?: string): locale is string =>
    !!(locale && data.localeToRepoIdMap[locale]);

export const getLocaleFromRepoId = (repoId: string) => data.repoIdToLocaleMap[repoId];

export const getLayersData = () => data;

// Pushes any nodes which exists on master in the root project to master on
// the child layers as well.
//
// We do this programatically, as content studio tends to crash when publishing
// a very large number of nodes in one action, and to avoid confusing editor staff
// with an apparent large number of publish dependencies when localizing content
export const pushLayerContentToMaster = (pushMissingOnly: boolean) => {
    logger.info('Starting job to publish layer content to master');

    const nodeIdsInRootRepoMaster = batchedNodeQuery({
        repoParams: { repoId: contentRootRepoId, branch: 'master' },
        queryParams: {},
    }).hits.map((hit) => hit.id);

    logger.info(`Found ${nodeIdsInRootRepoMaster.length} nodes in root repo`);

    Object.values(data.localeToRepoIdMap).forEach((repoId) => {
        if (repoId === contentRootRepoId) {
            return;
        }

        const existingNodesSet = batchedNodeQuery({
            repoParams: { repoId: repoId, branch: 'master' },
            queryParams: {},
        }).hits.reduce((acc, hit) => {
            acc[hit.id] = true;
            return acc;
        }, {} as Record<string, true>);

        const nodesToPush = pushMissingOnly
            ? nodeIdsInRootRepoMaster.filter((id) => !existingNodesSet[id])
            : nodeIdsInRootRepoMaster;
        if (nodesToPush.length === 0) {
            logger.info(`No missing nodes found for ${repoId}`);
            return;
        }

        logger.info(`Pushing ${nodesToPush.length} to master in layer repo ${repoId}`);

        const repoConnection = nodeLib.connect({
            repoId: repoId,
            branch: 'draft',
            user: {
                login: 'su',
            },
            principals: ['role:system.admin'],
        });

        toggleCacheInvalidationOnNodeEvents({ shouldDefer: true, maxDeferTime: fifteenMinutesMs });

        const result = repoConnection.push({
            keys: nodesToPush,
            target: 'master',
            resolve: false,
        });

        toggleCacheInvalidationOnNodeEvents({ shouldDefer: false });

        logger.info(
            `Result for ${repoId} // Success: (${result.success.length}) - Failed: (${
                result.failed.length
            }) ${JSON.stringify(result.failed)}`
        );
    });

    logger.info('Finished job to publish layer content to master!');
};

const populateWithChildLayers = (
    projects: readonly Project[],
    newMap: LocaleToRepoIdMap,
    parentId: string
) => {
    projects.forEach((project) => {
        const { parent, id, language } = project;
        if (parent !== parentId || !isValidLocale(language)) {
            return;
        }

        if (newMap[language]) {
            logger.error(`Layer was already specified for locale ${language}`);
        } else {
            newMap[language] = `${contentRepoPrefix}.${id}`;
        }

        populateWithChildLayers(projects, newMap, id);
    });
};

const refreshLayersData = () => {
    const projects = runInContext({ asAdmin: true }, () => projectLib.list());

    const newMap: LocaleToRepoIdMap = {};

    const rootProject = projects.find((project) => project.id === contentRootProjectId);
    if (!rootProject || !isValidLocale(rootProject.language)) {
        logger.critical(`No valid root project found!`);
        return;
    }

    newMap[rootProject.language] = contentRootRepoId;

    populateWithChildLayers(projects, newMap, contentRootProjectId);

    const newMapEntries = Object.entries(newMap);

    data.defaultLocale = rootProject.language;
    data.localeToRepoIdMap = newMap;
    data.repoIdToLocaleMap = newMapEntries.reduce((acc, [locale, repoId]) => {
        return { ...acc, [repoId]: locale };
    }, {} as RepoIdToLocaleMap);
    data.sources.master = newMapEntries.map(([_, repoId]) => {
        return { repoId, branch: 'master', principals: ['role:system.admin'] as PrincipalKey[] };
    });
    data.sources.draft = newMapEntries.map(([_, repoId]) => {
        return { repoId, branch: 'draft', principals: ['role:system.admin'] as PrincipalKey[] };
    });

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
            if (!event.data?.id?.startsWith(contentRepoPrefix)) {
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

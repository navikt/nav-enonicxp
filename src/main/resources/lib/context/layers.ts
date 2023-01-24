import projectLib, { Project } from '/lib/xp/project';
import eventLib, { EnonicEvent } from '/lib/xp/event';
import nodeLib from '/lib/xp/node';
import { Locale } from '../../types/common';
import { runInContext } from './run-in-context';
import { logger } from '../utils/logging';
import { contentRootRepoId, contentRepoPrefix, contentRootProjectId } from '../constants';
import { batchedNodeQuery } from '../utils/batched-query';
import { toggleCacheInvalidationOnNodeEvents } from '../cache/invalidate-event-handlers';

type LocaleToRepoIdMap = { [key in Locale]?: string };
type RepoIdToLocaleMap = { [key: string]: Locale };

let localeToRepoIdMap: LocaleToRepoIdMap = {};
let repoIdToLocaleMap: RepoIdToLocaleMap = {};

const fifteenMinutesMs = 1000 * 60 * 15;

const validLocales: { [key in Locale]: true } = {
    no: true,
    nn: true,
    en: true,
    se: true,
    ru: true,
    uk: true,
};

export const isValidLocale = (locale?: string): locale is Locale =>
    !!(locale && validLocales[locale as Locale]);

export const getLocaleFromRepoId = (repoId: string) => repoIdToLocaleMap[repoId];

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

    Object.values(localeToRepoIdMap).forEach((repoId) => {
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

const refreshLocaleLayersRepoMap = () => {
    const projects = runInContext({ asAdmin: true }, () => projectLib.list());

    const newMap: LocaleToRepoIdMap = {};

    const rootProject = projects.find((project) => project.id === contentRootProjectId);
    if (!rootProject || !isValidLocale(rootProject.language)) {
        logger.critical(`No valid root project found!`);
        return;
    }

    newMap[rootProject.language] = contentRootRepoId;

    populateWithChildLayers(projects, newMap, contentRootProjectId);

    localeToRepoIdMap = newMap;
    repoIdToLocaleMap = Object.entries(newMap).reduce((acc, [locale, repoId]) => {
        return { ...acc, [repoId]: locale as Locale };
    }, {} as RepoIdToLocaleMap);

    logger.info(`Content layers: ${JSON.stringify(localeToRepoIdMap)}`);
};

let hasSetupListeners = false;

export const initLayersMap = () => {
    refreshLocaleLayersRepoMap();

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
            refreshLocaleLayersRepoMap();
        },
    });
};

export const runInLocaleContext = <ReturnType>(
    func: () => ReturnType,
    locale: Locale
): ReturnType => {
    const repoId = localeToRepoIdMap[locale];
    if (!repoId) {
        logger.error(
            `Attempted to set locale context for ${locale} but no layer was found for this locale!`
        );
    }

    return runInContext({ repository: repoId || contentRootRepoId }, func);
};

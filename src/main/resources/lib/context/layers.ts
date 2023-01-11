import projectLib, { Project } from '/lib/xp/project';
import eventLib, { EnonicEvent } from '/lib/xp/event';
import { Locale } from '../../types/common';
import { runInContext } from './run-in-context';
import { logger } from '../utils/logging';
import { contentRepoDefault, contentRepoPrefix, contentRootProjectId } from '../constants';

type LocaleToLayerRepoIdMap = { [key in Locale]?: string };
let localeToLayerRepoIdMap: LocaleToLayerRepoIdMap = {};

const validLocales: { [key in Locale]: true } = {
    no: true,
    nn: true,
    en: true,
    se: true,
    ru: true,
    uk: true,
};

const isValidLocale = (locale?: string): locale is Locale =>
    !!(locale && validLocales[locale as Locale]);

const populateWithChildLayers = (
    projects: readonly Project[],
    newMap: LocaleToLayerRepoIdMap,
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

const refreshLayersMap = () => {
    const projects = runInContext({ asAdmin: true }, () => projectLib.list());

    const newMap: LocaleToLayerRepoIdMap = {};

    const rootProject = projects.find((project) => project.id === contentRootProjectId);
    if (!rootProject || !isValidLocale(rootProject.language)) {
        logger.critical(`No valid root project found!`);
        return;
    }

    newMap[rootProject.language] = contentRepoDefault;

    populateWithChildLayers(projects, newMap, contentRootProjectId);

    localeToLayerRepoIdMap = newMap;
};

let hasSetupListeners = false;

export const initializeLayersMap = () => {
    refreshLayersMap();

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
            refreshLayersMap();
        },
    });
};

export const runInLocaleContext = <ReturnType>(
    func: () => ReturnType,
    locale: Locale
): ReturnType => {
    const repoId = localeToLayerRepoIdMap[locale];
    if (!repoId) {
        logger.error(
            `Attempted to set locale context for ${locale} but no layer was found for this locale!`
        );
    }

    return runInContext({ repository: repoId || contentRepoDefault }, func);
};

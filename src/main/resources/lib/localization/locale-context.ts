import * as contextLib from '/lib/xp/context';
import { logger } from '../utils/logging';
import { runInContext, RunInContextOptions } from '../context/run-in-context';
import { CONTENT_LOCALE_DEFAULT, CONTENT_ROOT_REPO_ID } from '../constants';
import { getLayersData } from './layers-data';

type RunInLocaleContextOptions = Omit<RunInContextOptions, 'repository'> & { locale?: string };

export const runInLocaleContext = <ReturnType>(
    {
        locale = getLayersData().defaultLocale,
        branch,
        asAdmin,
        asCurrentUser,
        attributes,
    }: RunInLocaleContextOptions,
    func: () => ReturnType
): ReturnType => {
    const { localeToRepoIdMap, defaultLocale } = getLayersData();
    const repoId = localeToRepoIdMap[locale];

    const repoIdActual = repoId || CONTENT_ROOT_REPO_ID;
    const localeActual = repoId ? locale : defaultLocale;

    if (!repoId) {
        logger.info(
            `Attempted to set locale context to "${locale}" but no layer was found for this locale - setting to default`
        );
    }

    return runInContext(
        {
            repository: repoIdActual,
            branch,
            asAdmin,
            asCurrentUser,
            attributes: { ...attributes, locale: localeActual },
        },
        func
    );
};

export const getLocaleFromContext = () =>
    (contextLib.get()?.attributes as { locale?: string })?.locale || CONTENT_LOCALE_DEFAULT;

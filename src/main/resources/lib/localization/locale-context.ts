import { logger } from '../utils/logging';
import { runInContext, RunInContextOptions } from '../context/run-in-context';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { getLayersData } from './layers-data';

type RunInLocaleContextOptions = Omit<RunInContextOptions, 'repository'> & { locale: string };

export const runInLocaleContext = <ReturnType>(
    { locale, branch, asAdmin }: RunInLocaleContextOptions,
    func: () => ReturnType
): ReturnType => {
    const { localeToRepoIdMap } = getLayersData();
    const repoId = localeToRepoIdMap[locale];
    if (!repoId) {
        logger.error(
            `Attempted to set locale context for "${locale}" but no layer was found for this locale - Current layer repos: ${JSON.stringify(
                localeToRepoIdMap
            )}`
        );
    }

    return runInContext(
        { repository: repoId || CONTENT_ROOT_REPO_ID, branch, asAdmin, attributes: { locale } },
        func
    );
};

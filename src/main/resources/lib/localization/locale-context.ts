import { logger } from '../utils/logging';
import { runInContext, RunInContextOptions } from '../context/run-in-context';
import { contentRootRepoId } from '../constants';
import { getLayersData } from './layers-data';

type RunInLocaleContextOptions = Omit<RunInContextOptions, 'repository'> & { locale: string };

export const runInLocaleContext = <ReturnType>(
    { locale, branch, asAdmin }: RunInLocaleContextOptions,
    func: () => ReturnType
): ReturnType => {
    const repoId = getLayersData().localeToRepoIdMap[locale];
    if (!repoId) {
        logger.error(JSON.stringify(getLayersData().localeToRepoIdMap));
        logger.error(
            `Attempted to set locale context for "${locale}" but no layer was found for this locale!`
        );
    }

    return runInContext(
        { repository: repoId || contentRootRepoId, branch, asAdmin, attributes: { locale } },
        func
    );
};

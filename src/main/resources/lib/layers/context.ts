import { Locale } from '../../types/common';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { contentRootRepoId } from '../constants';
import { getLayersData } from './layers-data';

export const runInLocaleContext = <ReturnType>(
    func: () => ReturnType,
    locale: Locale
): ReturnType => {
    const repoId = getLayersData().localeToRepoIdMap[locale];
    if (!repoId) {
        logger.error(
            `Attempted to set locale context for ${locale} but no layer was found for this locale!`
        );
    }

    return runInContext({ repository: repoId || contentRootRepoId }, func);
};

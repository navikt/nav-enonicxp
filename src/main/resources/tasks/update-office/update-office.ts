import { runOfficeFetchTask } from '../../lib/office-pages/office-tasks';
import { isCuratedImportInProgress } from '../../lib/curated-export/safety';
import { logger } from '../../lib/utils/logging';

export const run = () => {
    // Schedules persisted before the import still fire, and must not change content mid-import.
    if (isCuratedImportInProgress()) {
        logger.warning('Skipping office import task while a curated import is in progress');
        return;
    }
    runOfficeFetchTask();
};

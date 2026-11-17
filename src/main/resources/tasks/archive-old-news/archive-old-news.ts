import { runJobWithResult, STARTED_BY_SCHEDULE } from '../../lib/jobs/job-results';
import { logger } from '../../lib/utils/logging';
import { archiveOldNews } from '../../lib/archiving/archive-old-news';
import { isCuratedImportInProgress } from '../../lib/curated-export/safety';

export const run = () => {
    // Schedules persisted before the import still fire, and must not change content mid-import.
    if (isCuratedImportInProgress()) {
        logger.warning('Skipping archive old news task while a curated import is in progress');
        return;
    }
    logger.info('Running archive old news task');
    runJobWithResult({
        jobName: 'oldNewsUnpublish',
        startedBy: STARTED_BY_SCHEDULE,
        callback: archiveOldNews,
    });
};

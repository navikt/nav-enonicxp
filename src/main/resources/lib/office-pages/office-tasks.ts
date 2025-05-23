import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { logger } from '../utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { processAllOffices, fetchAllOfficeDataFromNorg } from './office-update';
import { runInContext } from '../context/run-in-context';

const OFFICE_FETCH_TASK_NAME = 'no.nav.navno:update-office';
const CRON_SCHEDULE = app.config.env === 'localhost' ? '*/10 * * * *' : '* * * * *';

const MAX_FAILURE_COUNT_BEFORE_CRITICAL = 10;

let consecutiveFetchFailureCount = 0;

export const runOfficeFetchTask = () => {
    const offices = fetchAllOfficeDataFromNorg();

    if (!offices) {
        consecutiveFetchFailureCount++;
        if (consecutiveFetchFailureCount % MAX_FAILURE_COUNT_BEFORE_CRITICAL === 0) {
            logger.critical(
                `Failed to fetch office data from norg2 on the last ${consecutiveFetchFailureCount} attempts!`
            );
        }

        return;
    }

    consecutiveFetchFailureCount = 0;

    logger.info(`Fetched ${offices.length} office from norg2, updating site data...`);

    runInContext({ repository: CONTENT_ROOT_REPO_ID, branch: 'draft', asAdmin: true }, () =>
        processAllOffices(offices)
    );
};

export const createOfficeImportSchedule = () => {
    createOrUpdateSchedule({
        jobName: 'office_import_schedule',
        jobDescription:
            'Imports and updates legacy office information from norg2 every minute (or every 10 minutes in localhost)',
        jobSchedule: {
            type: 'CRON',
            value: CRON_SCHEDULE,
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: OFFICE_FETCH_TASK_NAME,
        taskConfig: {},
    });
};

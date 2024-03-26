import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { logger } from '../utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { processAllOffices, fetchAllOfficeDataFromNorg } from './office-update';
import { runInContext } from '../context/run-in-context';

const OFFICE_BRANCH_FETCH_TASK_NAME = 'no.nav.navno:update-office';
const CRON_SCHEDULE = app.config.env === 'localhost' ? '*/3 * * * *' : '* * * * *';

const MAX_FAILURE_COUNT_BEFORE_CRITICAL = 10;

let consecutiveFetchFailureCount = 0;

export const runOfficeFetchTask = () => {
    const offices = fetchAllOfficeDataFromNorg();

    if (!offices) {
        consecutiveFetchFailureCount++;
        if (consecutiveFetchFailureCount % MAX_FAILURE_COUNT_BEFORE_CRITICAL === 0) {
            logger.critical(
                `Failed to fetch office branch data from norg2 on the last ${consecutiveFetchFailureCount} attempts!`
            );
        }

        return;
    }

    consecutiveFetchFailureCount = 0;

    logger.info(`Fetched ${offices.length} office branches from norg2, updating site data...`);

    runInContext({ repository: CONTENT_ROOT_REPO_ID, branch: 'draft', asAdmin: true }, () =>
        processAllOffices(offices)
    );
};

export const createOfficeFetchSchedule = () => {
    createOrUpdateSchedule({
        jobName: 'office_update_from_norg2_schedule',
        jobDescription: 'Fetches office branches from norg and updates into XP as hourly schedule',
        jobSchedule: {
            type: 'CRON',
            value: CRON_SCHEDULE,
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: OFFICE_BRANCH_FETCH_TASK_NAME,
        taskConfig: {},
    });
};

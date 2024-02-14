import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { logger } from '../utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { processAllOfficeBranches, fetchAllOfficeBranchDataFromNorg } from './office-branch-update';
import { runInContext } from '../context/run-in-context';

const OFFICE_BRANCH_FETCH_TASK_NAME = 'no.nav.navno:update-office-branch';
const CRON_SCHEDULE = app.config.env === 'localhost' ? '20 * * * *' : '* * * * *';

const MAX_FAILURE_COUNT_BEFORE_CRITICAL = 10;

let consecutiveFetchFailureCount = 0;

export const runOfficeBranchFetchTask = () => {
    const officeBranches = fetchAllOfficeBranchDataFromNorg();

    if (!officeBranches) {
        consecutiveFetchFailureCount++;
        if (consecutiveFetchFailureCount % MAX_FAILURE_COUNT_BEFORE_CRITICAL === 0) {
            logger.critical(
                `Failed to fetch office branch data from norg2 on the last ${consecutiveFetchFailureCount} attempts!`
            );
        }

        return;
    }

    consecutiveFetchFailureCount = 0;

    logger.info(
        `Fetched ${officeBranches.length} office branches from norg2, updating site data...`
    );

    runInContext({ repository: CONTENT_ROOT_REPO_ID, branch: 'draft', asAdmin: true }, () =>
        processAllOfficeBranches(officeBranches)
    );
};

export const createOfficeBranchFetchSchedule = () => {
    createOrUpdateSchedule({
        jobName: 'office_branch_update_from_norg2_schedule',
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

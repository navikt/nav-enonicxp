import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { logger } from '../utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { processAllOfficeBranches, fetchAllOfficeBranchesFromNorg } from './update';
import { runInContext } from '../context/run-in-context';

const OFFICE_BRANCH_FETCH_TASK_NAME = 'no.nav.navno:update-office-branch';

export const runOfficeBranchFetchTask = () => {
    const officeBranches = fetchAllOfficeBranchesFromNorg();

    if (!officeBranches) {
        logger.critical('OfficeImporting: Failed to fetch office branch from norg2');
        return;
    }

    logger.info(
        `OfficeImporting: Fetched ${officeBranches.length} office branches from norg2, updating site data...`
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
            value: '*/5 * * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: OFFICE_BRANCH_FETCH_TASK_NAME,
        taskConfig: {},
    });
};

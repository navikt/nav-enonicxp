import * as taskLib from '/lib/xp/task';
import * as contextLib from '/lib/xp/context';
import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { UpdateOfficeBranchConfig } from '../../tasks/update-office-branch/update-office-branch-config';
import { logger } from '../utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { processAllOfficeBranches, fetchAllOfficeBranchesFromNorg } from './update';

const officeBranchFetchTaskName = 'no.nav.navno:update-office-branch';
const fetchRetryDelay = 5 * 60 * 1000;

const createOfficeBranchFetchSingleTask = (retry: boolean, scheduledTime?: string) => {
    if (scheduledTime) {
        createOrUpdateSchedule<UpdateOfficeBranchConfig>({
            jobName: 'office_branch_update_from_norg2_singlejob',
            jobDescription: 'Fetches office branches from norg and updates into XP as a single job',
            taskDescriptor: officeBranchFetchTaskName,
            jobSchedule: {
                type: 'ONE_TIME',
                value: scheduledTime,
            },
            taskConfig: {
                retry,
            },
            masterOnly: false,
        });
    } else {
        taskLib.submitTask<UpdateOfficeBranchConfig>({
            descriptor: officeBranchFetchTaskName,
            config: {
                retry,
            },
        });
    }
};

export const runOfficeBranchFetchTask = (retry?: boolean, branch = 'draft') => {
    return;
    const officeBranches = fetchAllOfficeBranchesFromNorg();
    if (!officeBranches) {
        if (retry) {
            logger.error('OfficeImporting: Failed to fetch from norg2, retrying in 5 minutes');
            createOfficeBranchFetchSingleTask(
                false,
                new Date(Date.now() + fetchRetryDelay).toISOString()
            );
        } else {
            logger.critical('OfficeImporting: Failed to fetch office branch from norg2');
        }
        return;
    }

    logger.info(
        `OfficeImporting: Fetched ${officeBranches.length} office branches from norg2, updating site data...`
    );

    contextLib.run(
        {
            repository: CONTENT_ROOT_REPO_ID,
            user: {
                login: 'su',
                idProvider: 'system',
            },
            branch,
            principals: ['role:system.admin'],
        },
        () => processAllOfficeBranches(officeBranches)
    );
};

export const createOfficeBranchFetchSchedule = () => {
    createOrUpdateSchedule<UpdateOfficeBranchConfig>({
        jobName: 'office_branch_update_from_norg2_schedule',
        jobDescription: 'Fetches office branches from norg and updates into XP as hourly schedule',
        jobSchedule: {
            type: 'CRON',
            value: '30 * * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: officeBranchFetchTaskName,
        taskConfig: { retry: app.config.env !== 'localhost' },
    });
};

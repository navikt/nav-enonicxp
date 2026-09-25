import { createOrUpdateSchedule } from '../scheduling/schedule-job';
import { logger } from '../utils/logging';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { processAllOffices, fetchAllOfficeDataFromNorg } from './office-update';
import { runInContext } from '../context/run-in-context';
import * as schedulerLib from '/lib/xp/scheduler';

const OFFICE_FETCH_TASK_NAME = 'no.nav.navno:update-office';
const LEGACY_OFFICE_IMPORT_SCHEDULE_NAME = 'legacy_office_import_schedule';

const MAX_FAILURE_COUNT_BEFORE_CRITICAL = 10;

let consecutiveFetchFailureCount = 0;

// TODO: Remove after local sandboxes no longer retain legacy_office_import_schedule.
const disableLegacyOfficeImportSchedule = () =>
    runInContext({ branch: 'master', asAdmin: true }, () => {
        const legacySchedule = schedulerLib.get({ name: LEGACY_OFFICE_IMPORT_SCHEDULE_NAME });
        if (!legacySchedule?.enabled) {
            return;
        }

        schedulerLib.modify({
            name: LEGACY_OFFICE_IMPORT_SCHEDULE_NAME,
            editor: (schedule) => ({ ...schedule, enabled: false }),
        });
        logger.info(`Scheduler job disabled: ${LEGACY_OFFICE_IMPORT_SCHEDULE_NAME}`);
    });

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

export const createOfficeImportSchedule = (env = app.config.env) => {
    if (env === 'localhost') {
        disableLegacyOfficeImportSchedule();
    }

    createOrUpdateSchedule({
        jobName: 'office_import_schedule',
        jobDescription:
            'Imports and updates legacy office information from norg2 every minute (or every 10 minutes in localhost)',
        jobSchedule: {
            type: 'CRON',
            value: env === 'localhost' ? '*/10 * * * *' : '* * * * *',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: OFFICE_FETCH_TASK_NAME,
        taskConfig: {},
        enabled: env !== 'localhost',
    });
};

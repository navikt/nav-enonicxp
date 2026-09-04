import * as schedulerLib from '/lib/xp/scheduler';
import { logger } from '../utils/logging';

type ManageScheduledJobsConfig = {
    operation?: 'list' | 'list-obsolete' | 'delete' | 'delete-obsolete';
    jobNames?: string | string[];
    confirmDelete?: boolean;
};

export const OBSOLETE_SCHEDULED_JOB_NAMES = [
    'office_info_norg2_hourly',
    'office_info_update',
    'legacy_office_import_schedule',
    'office_update_from_norg2_schedule',
];

const normalizeJobNames = (jobNames?: string | string[]) => {
    if (!jobNames) {
        return [];
    }

    return (Array.isArray(jobNames) ? jobNames : [jobNames])
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
};

const logJob = (job: ReturnType<typeof schedulerLib.list>[number]) => {
    logger.info(
        `Scheduled job: ${JSON.stringify({
            name: job.name,
            descriptor: job.descriptor,
            enabled: job.enabled,
            schedule: job.schedule,
            lastRun: job.lastRun,
            lastTaskId: job.lastTaskId,
        })}`
    );
};

export const manageScheduledJobs = ({
    operation = 'list',
    jobNames,
    confirmDelete = false,
}: ManageScheduledJobsConfig) => {
    const jobs = schedulerLib.list();
    const normalizedJobNames =
        operation === 'list-obsolete' || operation === 'delete-obsolete'
            ? OBSOLETE_SCHEDULED_JOB_NAMES
            : normalizeJobNames(jobNames);
    const selectedJobs =
        normalizedJobNames.length === 0
            ? jobs
            : jobs.filter((job) => normalizedJobNames.indexOf(job.name) >= 0);

    selectedJobs.forEach(logJob);

    const missingJobNames = normalizedJobNames.filter(
        (name) => !jobs.some((job) => job.name === name)
    );
    const deletedJobNames: string[] = [];
    if (operation !== 'list-obsolete') {
        missingJobNames.forEach((name) => logger.warning(`Scheduled job not found: ${name}`));
    }

    if (operation !== 'delete' && operation !== 'delete-obsolete') {
        return { selectedJobs, missingJobNames, deletedJobNames };
    }

    if (normalizedJobNames.length === 0) {
        logger.error('Refusing to delete scheduler jobs without exact job names');
        return { selectedJobs, missingJobNames, deletedJobNames };
    }

    if (!confirmDelete) {
        logger.error('Refusing to delete scheduler jobs without confirmation');
        return { selectedJobs, missingJobNames, deletedJobNames };
    }

    selectedJobs.forEach((job) => {
        const deleted = schedulerLib.delete({ name: job.name });
        if (deleted) {
            deletedJobNames.push(job.name);
        }
        logger.info(`Scheduled job deletion ${deleted ? 'succeeded' : 'failed'}: ${job.name}`);
    });

    return { selectedJobs, missingJobNames, deletedJobNames };
};

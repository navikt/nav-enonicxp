import { getMiscRepoConnection } from '../repos/misc-repo';
import { logger } from '../utils/logging';

// Webapp jobs run as XP tasks, which XP forgets shortly after they finish. The last result
// of each job is stored here so the webapp can show it.
const RESULTS_ROOT_NAME = 'webapp-job-results';
const RESULTS_ROOT_PATH = `/${RESULTS_ROOT_NAME}`;
const MAX_SUMMARY_LENGTH = 2000;

export const STARTED_BY_SCHEDULE = 'Planlagt kjøring';

type JobStatus = 'running' | 'ok' | 'failed';

export type JobResult = {
    status: JobStatus;
    startedAt: string;
    finishedAt?: string;
    startedBy: string;
    summary?: string;
};

type JobResultNode = { result: JobResult };

const getResultsRepo = () => {
    const repo = getMiscRepoConnection();
    if (!repo.exists(RESULTS_ROOT_PATH)) {
        repo.create({ _parentPath: '/', _name: RESULTS_ROOT_NAME });
    }
    return repo;
};

const getResultPath = (jobName: string) => `${RESULTS_ROOT_PATH}/${jobName}`;

export const storeJobResult = (jobName: string, result: JobResult) => {
    try {
        const repo = getResultsRepo();
        const path = getResultPath(jobName);

        if (repo.exists(path)) {
            repo.modify<JobResultNode>({ key: path, editor: (node) => ({ ...node, result }) });
        } else {
            repo.create({ _parentPath: RESULTS_ROOT_PATH, _name: jobName, result });
        }

        repo.refresh();
    } catch (e) {
        // Failing to store the result should not stop the job itself
        logger.error(`Failed to store result for webapp job ${jobName} - ${e}`);
    }
};

const summarize = (value: unknown) => {
    if (value === undefined || value === null) {
        return undefined;
    }

    const summary = typeof value === 'string' ? value : JSON.stringify(value);
    return summary.length > MAX_SUMMARY_LENGTH
        ? `${summary.slice(0, MAX_SUMMARY_LENGTH)}…`
        : summary;
};

export const runJobWithResult = ({
    jobName,
    startedBy,
    callback,
}: {
    jobName: string;
    startedBy: string;
    callback: () => unknown;
}) => {
    const startedAt = new Date().toISOString();

    storeJobResult(jobName, { status: 'running', startedAt, startedBy });

    try {
        const summary = summarize(callback());
        storeJobResult(jobName, {
            status: 'ok',
            startedAt,
            finishedAt: new Date().toISOString(),
            startedBy,
            ...(summary && { summary }),
        });
    } catch (e) {
        storeJobResult(jobName, {
            status: 'failed',
            startedAt,
            finishedAt: new Date().toISOString(),
            startedBy,
            summary: String(e),
        });
        throw e;
    }
};

export const getJobResult = (jobName: string): JobResult | null => {
    try {
        const node = getMiscRepoConnection().get<JobResultNode>(getResultPath(jobName));
        return node?.result ?? null;
    } catch (e) {
        logger.error(`Failed to get result for webapp job ${jobName} - ${e}`);
        return null;
    }
};

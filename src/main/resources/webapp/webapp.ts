import { Request } from '@enonic-types/core';
import * as taskLib from '/lib/xp/task';
import * as authLib from '/lib/xp/auth';
import { TaskInfo } from '@enonic-types/lib-task';
import thymeleafLib from '/lib/thymeleaf';
import { runOfficeFetchTask } from '../lib/office-pages/office-tasks';
import { runInContext } from '../lib/context/run-in-context';
import { frontendInvalidateAllSync } from '../lib/cache/frontend-cache';
import { requestSitemapUpdate, SITEMAP_JOB_NAME } from '../lib/sitemap/sitemap';
import { updateScheduledPublishJobs } from '../lib/scheduling/scheduled-publish-updater';
import { generateUUID } from '../lib/utils/uuid';
import { removeUnpublishedFromAllContentLists } from '../lib/contentlists/remove-unpublished';
import { userIsAdmin } from '../lib/utils/auth-utils';
import { externalSearchUpdateAll } from '../lib/search/update-all';
import { URLS } from '../lib/constants';
import { runSchedulerCleanup } from '../lib/scheduling/schedule-cleanup';
import { NAVOccurences } from '../lib/reporting/NAVOccurrences';
import { archiveOldNews } from '../lib/archiving/archive-old-news';
import { manageScheduledJobs } from '../lib/scheduling/manage-scheduled-jobs';
import { handleCuratedExportRequest } from '../lib/curated-export/source/access';
import {
    getJobResult,
    JobResult,
    runJobWithResult,
    storeJobResult,
} from '../lib/jobs/job-results';
import { getScheduleDescription } from '../lib/scheduling/schedule-description';

type Action = {
    description: string;
    // Names or descriptions of scheduled or background tasks which run the same job
    relatedTasks?: string[];
    // Name of the scheduler job which runs this job automatically
    scheduleName?: string;
} & (
    | { callback: () => any }
    // For jobs which store their own result, from a task in relatedTasks
    | { startJob: (startedBy: string) => void }
);

type ActionsMap = Record<string, Action>;

const SITEMAP_WAIT_MS = 10 * 60 * 1000;
const SITEMAP_POLL_MS = 2000;

const requestSitemapAndWaitForResult = (startedBy: string) => {
    const requestedAt = Date.now();
    requestSitemapUpdate(startedBy);
    taskLib.progress({ info: 'Venter på at sitemap blir generert' });

    while (Date.now() - requestedAt < SITEMAP_WAIT_MS) {
        taskLib.sleep(SITEMAP_POLL_MS);
        const result = getJobResult(SITEMAP_JOB_NAME);
        if (result?.finishedAt && new Date(result.finishedAt).getTime() >= requestedAt) {
            return;
        }
    }

    storeJobResult(SITEMAP_JOB_NAME, {
        status: 'failed',
        startedAt: new Date(requestedAt).toISOString(),
        finishedAt: new Date().toISOString(),
        startedBy,
        summary: `Fikk ikke svar fra sitemap-generering innen ${SITEMAP_WAIT_MS / 60000} minutter`,
    });
};

const view = resolve('webapp.html');

const validActions: ActionsMap = {
    norg: {
        description: 'Oppdater kontor fra norg',
        scheduleName: 'office_import_schedule',
        callback: () => {
            const result = runOfficeFetchTask();
            if (!result) {
                throw new Error('Klarte ikke å hente kontordata fra norg2');
            }
            return result;
        },
    },
    wipeCache: {
        description: 'Slett frontend-cache',
        callback: () => {
            const response = frontendInvalidateAllSync(`manual-wipe-${generateUUID()}`);
            if (!response) {
                throw new Error(
                    `Fikk ikke svar fra revalidator-proxy (${URLS.REVALIDATOR_PROXY_ORIGIN})`
                );
            }
            return 'Revalidator-proxy bekreftet sletting av frontend-cache';
        },
    },
    generateSitemap: {
        description: 'Generer data for sitemap',
        startJob: requestSitemapAndWaitForResult,
        relatedTasks: ['sitemap-generator-task'],
        scheduleName: 'sitemap-generator-schedule',
    },
    updatePrepublishJobs: {
        description: 'Oppretter scheduler-jobs for prepublish/unpublish',
        callback: updateScheduledPublishJobs,
    },
    removeUnpublishedFromContentLists: {
        description: 'Fjern avpublisert innhold fra alle innholdslister',
        callback: removeUnpublishedFromAllContentLists,
    },
    schedulerCleanup: {
        description: 'Fjern expired scheduler jobs',
        callback: runSchedulerCleanup,
        relatedTasks: ['no.nav.navno:scheduler-cleanup'],
        scheduleName: 'scheduler-cleanup',
    },
    reportNAVOccurences: {
        description: 'Går igjennom alt publisert innhold og rapporterer NAV-forekomster',
        callback: NAVOccurences,
    },
    oldNewsUnpublish: {
        description: 'Avpubliser og arkiver gamle nyheter/pressemeldinger',
        callback: archiveOldNews,
        relatedTasks: ['no.nav.navno:archive-old-news'],
        scheduleName: 'archive-old-news',
    },
    ...(!!URLS.SEARCH_API_URL && {
        updateAllSearchNodesExternal: {
            description: 'Oppdater alle dokumenter for eksternt søk',
            callback: externalSearchUpdateAll,
        },
    }),
    // These should only be used after creating a new content layer
    // pushLayerContentToMaster: {
    //     description:
    //         'Push manglende layer content til master (bør gjøres etter opprettelse av nytt layer)',
    //     callback: () => pushLayerContentToMaster(true),
    // },
    // ...(app.config.env !== 'p' && {
    //     pushLayerContentToMasterFull: {
    //         description:
    //             'Push ALT layer content til master (OBS: denne kan føre til at avpublisert innhold i layeret blir republisert! Ikke la denne være aktiv i prod med mindre det er et spesielt behov :))',
    //         callback: () => pushLayerContentToMaster(false),
    //     },
    // }),
};

type Params = {
    cmd: keyof typeof validActions;
};

const accessDeniedResponse = {
    body: '<div>Administrator-tilgang er påkrevd</div>',
    contentType: 'text/html; charset=UTF-8',
};

const statusTexts: Record<JobResult['status'], string> = {
    running: 'Kjører',
    ok: 'Fullført',
    failed: 'Feilet',
};

const getActiveTask = (tasks: TaskInfo[], action: Action) => {
    const taskIds = [action.description, ...(action.relatedTasks || [])];
    return tasks.find(
        (task) =>
            (taskIds.includes(task.description) || taskIds.includes(task.name)) &&
            (task.state === 'RUNNING' || task.state === 'WAITING')
    );
};

const getProgressText = (task: TaskInfo) => {
    const { info, current, total } = task.progress;
    const count = total > 0 ? `${current} av ${total}` : '';
    return [info, count].filter(Boolean).join(' – ') || null;
};

const getDurationText = (startedAt: string, finishedAt?: string) => {
    if (!finishedAt) {
        return null;
    }

    const seconds = Math.max(
        0,
        Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000)
    );
    if (seconds < 60) {
        return `${seconds} s`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} min ${seconds % 60} s`;
    }

    return `${Math.floor(minutes / 60)} t ${minutes % 60} min`;
};

const getLastResultModel = (jobName: string, activeTask?: TaskInfo) => {
    const result = getJobResult(jobName);
    if (!result) {
        return null;
    }

    // The stored status stays 'running' if the server stopped while the job was running
    const isAborted = result.status === 'running' && !activeTask;

    return {
        ...result,
        statusKey: isAborted ? 'aborted' : result.status,
        statusText: isAborted ? 'Avbrutt' : statusTexts[result.status],
        duration: getDurationText(result.startedAt, result.finishedAt),
    };
};

// Some scheduled runs are not recorded (e.g. the office import, which runs every minute), so we
// fall back to the scheduler's own timestamp when it is newer than the stored result
const getUnrecordedScheduledRun = (lastRun?: string, lastResultStartedAt?: string) => {
    if (!lastRun) {
        return null;
    }

    if (lastResultStartedAt && new Date(lastResultStartedAt) >= new Date(lastRun)) {
        return null;
    }

    return lastRun;
};

const renderWebapp = (runningCmd?: string, message?: string) => {
    const { selectedJobs: obsoleteJobs } = runInContext({ asAdmin: true }, () =>
        manageScheduledJobs({ operation: 'list-obsolete' })
    );

    const tasks = taskLib.list();

    const cmds = Object.entries(validActions).map(([name, action]) => {
        const activeTask = getActiveTask(tasks, action);
        const schedule = action.scheduleName ? getScheduleDescription(action.scheduleName) : null;
        const lastResult = getLastResultModel(name, activeTask);
        return {
            cmd: name,
            description: action.description,
            schedule,
            lastResult,
            lastScheduledRun: getUnrecordedScheduledRun(schedule?.lastRun, lastResult?.startedAt),
            progress: activeTask ? getProgressText(activeTask) : null,
            isRunning: !!activeTask,
        };
    });

    const model = {
        actionUrl: '/webapp/' + app.name,
        cmds,
        hasRunningJobs: cmds.some((cmd) => cmd.isRunning),
        runningCmd,
        obsoleteJobs,
        hasObsoleteJobs: obsoleteJobs.length > 0,
        message,
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html; charset=UTF-8',
    };
};

// Prevents bulk jobs from running in parallel if the page is opened more than once.
// Queued tasks count too, as executeFunction does not start the task immediately.
const isActionRunning = (action: Action) => !!getActiveTask(taskLib.list(), action);

export const get = (req: Request) => {
    const curatedExportResponse = handleCuratedExportRequest(req);
    if (curatedExportResponse) {
        return curatedExportResponse;
    }

    if (!userIsAdmin()) {
        return accessDeniedResponse;
    }

    const { cmd } = req.params as Params;

    const actionToRun = validActions[cmd];

    if (actionToRun && isActionRunning(actionToRun)) {
        return renderWebapp(undefined, `Jobben kjører allerede: ${actionToRun.description}`);
    }

    if (actionToRun) {
        const user = authLib.getUser();
        const startedBy = user?.displayName || user?.login || 'ukjent';

        taskLib.executeFunction({
            description: actionToRun.description,
            func: () => {
                runInContext({ branch: 'master', asAdmin: true }, () =>
                    'startJob' in actionToRun
                        ? actionToRun.startJob(startedBy)
                        : runJobWithResult({
                              jobName: cmd,
                              startedBy,
                              callback: actionToRun.callback,
                          })
                );
            },
        });
    }

    return renderWebapp(actionToRun ? cmd : undefined);
};

export const post = (req: Request) => {
    const curatedExportResponse = handleCuratedExportRequest(req);
    if (curatedExportResponse) {
        return curatedExportResponse;
    }

    if (!userIsAdmin()) {
        return accessDeniedResponse;
    }

    const { cmd, confirmDelete } = req.params as {
        cmd?: string;
        confirmDelete?: string;
    };

    if (cmd !== 'deleteObsoleteSchedulerJobs' || confirmDelete !== 'true') {
        return renderWebapp(undefined, 'Sletting ble ikke utført: bekreftelse mangler.');
    }

    const { deletedJobNames } = runInContext({ asAdmin: true }, () =>
        manageScheduledJobs({ operation: 'delete-obsolete', confirmDelete: true })
    );
    const message =
        deletedJobNames.length > 0
            ? `Slettet scheduler-jobber: ${deletedJobNames.join(', ')}`
            : 'Fant ingen utdaterte scheduler-jobber å slette.';

    return renderWebapp(undefined, message);
};

import { Request } from '@enonic-types/core';
import * as taskLib from '/lib/xp/task';
import thymeleafLib from '/lib/thymeleaf';
import { runOfficeFetchTask } from '../lib/office-pages/office-tasks';
import { runInContext } from '../lib/context/run-in-context';
import { frontendInvalidateAllAsync } from '../lib/cache/frontend-cache';
import { requestSitemapUpdate } from '../lib/sitemap/sitemap';
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

type ActionsMap = Record<string, { description: string; callback: () => any }>;

const view = resolve('webapp.html');

const validActions: ActionsMap = {
    norg: {
        description: 'Oppdater kontor fra norg',
        callback: runOfficeFetchTask,
    },
    wipeCache: {
        description: 'Slett frontend-cache',
        callback: () => {
            frontendInvalidateAllAsync(`manual-wipe-${generateUUID()}`);
        },
    },
    generateSitemap: {
        description: 'Generer data for sitemap',
        callback: requestSitemapUpdate,
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
        description: 'Fjern expired scheduler jobs (kjøres normalt automatisk hver morgen)',
        callback: runSchedulerCleanup,
    },
    reportNAVOccurences: {
        description: 'Går igjennom alt publisert innhold og rapporterer NAV-forekomster',
        callback: NAVOccurences,
    },
    oldNewsUnpublish: {
        description: 'Avpubliser og arkiver gamle nyheter/pressemeldinger',
        callback: archiveOldNews,
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

const renderWebapp = (runningCmd?: string, schedulerMessage?: string) => {
    const { selectedJobs: obsoleteJobs } = runInContext({ asAdmin: true }, () =>
        manageScheduledJobs({ operation: 'list-obsolete' })
    );

    const model = {
        actionUrl: '/webapp/' + app.name,
        cmds: Object.entries(validActions).map(([name, action]) => ({
            cmd: name,
            description: action.description,
        })),
        runningCmd,
        obsoleteJobs,
        hasObsoleteJobs: obsoleteJobs.length > 0,
        schedulerMessage,
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html; charset=UTF-8',
    };
};

export const get = (req: Request) => {
    if (!userIsAdmin()) {
        return accessDeniedResponse;
    }

    const { cmd } = req.params as Params;

    const actionToRun = validActions[cmd];

    if (actionToRun) {
        taskLib.executeFunction({
            description: actionToRun.description,
            func: () => {
                runInContext({ branch: 'master', asAdmin: true }, actionToRun.callback);
            },
        });
    }

    return renderWebapp(actionToRun ? cmd : undefined);
};

export const post = (req: Request) => {
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
    const schedulerMessage =
        deletedJobNames.length > 0
            ? `Slettet scheduler-jobber: ${deletedJobNames.join(', ')}`
            : 'Fant ingen utdaterte scheduler-jobber å slette.';

    return renderWebapp(undefined, schedulerMessage);
};

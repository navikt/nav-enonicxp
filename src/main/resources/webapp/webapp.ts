import * as taskLib from '/lib/xp/task';
import thymeleafLib from '/lib/thymeleaf';
import * as eventLib from '/lib/xp/event';
import { runOfficeBranchFetchTask } from '../lib/office-pages/office-branch-tasks';
import { runInContext } from '../lib/context/run-in-context';
import { frontendInvalidateAllAsync } from '../lib/cache/frontend-cache';
import { requestSitemapUpdate } from '../lib/sitemap/sitemap';
import { updateScheduledPublishJobs } from '../lib/scheduling/scheduled-publish-updater';
import { generateUUID } from '../lib/utils/uuid';
import { removeUnpublishedFromAllContentLists } from '../lib/contentlists/remove-unpublished';
import { userIsAdmin } from '../lib/utils/auth-utils';
import {
    revalidateAllSearchNodesAsync,
    SEARCH_NODES_UPDATE_ABORT_EVENT,
} from '../lib/search/_legacy/search-event-handlers';
import { pushLayerContentToMaster } from '../lib/localization/layers-data';
import { externalSearchUpdateAll } from '../lib/search/update-all';
import { URLS } from '../lib/constants';
import { fetchAndUpdateOfficeInfo } from '../lib/office-pages/_legacy-office-information/legacy-office-update';

type ActionsMap = Record<string, { description: string; callback: () => any }>;

const view = resolve('webapp.html');

const validActions: ActionsMap = {
    norg: {
        description: 'Oppdater kontor-info fra norg',
        callback: () => {
            runOfficeBranchFetchTask();
            fetchAndUpdateOfficeInfo();
        },
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
    updateAllSearchNodes: {
        description: 'Oppdater alle søke-noder',
        callback: revalidateAllSearchNodesAsync,
    },
    ...(!!URLS.SEARCH_API_URL && {
        updateAllSearchNodesExternal: {
            description: 'Oppdater alle søke-noder (eksternt søk)',
            callback: externalSearchUpdateAll,
        },
    }),
    abortSearchNodesUpdate: {
        description: 'Avbryt pågående batch-jobb for søke-config oppdateringer',
        callback: () => {
            eventLib.send({
                type: SEARCH_NODES_UPDATE_ABORT_EVENT,
                distributed: true,
            });
        },
    },
    pushLayerContentToMaster: {
        description:
            'Push manglende layer content til master (bør gjøres etter opprettelse av nytt layer)',
        callback: () => pushLayerContentToMaster(true),
    },
    ...(app.config.env !== 'p' && {
        pushLayerContentToMasterFull: {
            description:
                'Push ALT layer content til master (OBS: denne kan føre til at avpublisert innhold i layeret blir republisert! Ikke la denne være aktiv i prod med mindre det er et spesielt behov :))',
            callback: () => pushLayerContentToMaster(false),
        },
    }),
};

type Params = {
    cmd: keyof typeof validActions;
};

export const get = (req: XP.Request) => {
    if (!userIsAdmin()) {
        return {
            body: '<div>Administrator-tilgang er påkrevd</div>',
            contentType: 'text/html; charset=UTF-8',
        };
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

    const model = {
        actionUrl: '/webapp/' + app.name,
        cmds: Object.entries(validActions).map(([name, action]) => ({
            cmd: name,
            description: action.description,
        })),
        runningCmd: actionToRun ? cmd : undefined,
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html; charset=UTF-8',
    };
};

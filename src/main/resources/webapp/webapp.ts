import taskLib from '/lib/xp/task';
import thymeleafLib from '/lib/thymeleaf';
import eventLib from '/lib/xp/event';
import { runOfficeInfoUpdateTask } from '../lib/officeInformation';
import { runInContext } from '../lib/context/run-in-context';
import { frontendInvalidateAllAsync } from '../lib/cache/frontend-cache';
import { requestSitemapUpdate } from '../lib/sitemap/sitemap';
import { updateScheduledPublishJobs } from '../lib/scheduling/scheduled-publish-updater';
import { generateUUID } from '../lib/utils/uuid';
import { removeUnpublishedFromAllContentLists } from '../lib/contentlists/remove-unpublished';
import { userIsAdmin } from '../lib/utils/auth-utils';
import { searchNodesUpdateAbortEvent } from '../lib/search/eventHandlers';
import { pushLayerContentToMaster } from '../lib/context/layers';

type ActionsMap = { [key: string]: { description: string; callback: () => any } };

const view = resolve('webapp.html');
const validActions: ActionsMap = {
    norg: {
        description: 'Oppdater kontor-info fra norg',
        callback: () => runOfficeInfoUpdateTask(false),
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
        description: 'Oppretter scheduler-jobs for prepublish/unpublish (må kjøres på master)',
        callback: updateScheduledPublishJobs,
    },
    removeUnpublishedFromContentLists: {
        description: 'Fjern avpublisert innhold fra alle innholdslister',
        callback: removeUnpublishedFromAllContentLists,
    },
    abortSearchNodesUpdate: {
        description: 'Avbryt pågående batch-jobb for søke-config oppdateringer',
        callback: () => {
            eventLib.send({
                type: searchNodesUpdateAbortEvent,
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

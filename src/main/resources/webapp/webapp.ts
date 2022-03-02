import taskLib from '/lib/xp/task';
import thymeleafLib from '/lib/thymeleaf';
import { runOfficeInfoUpdateTask } from '../lib/officeInformation';
import { runInBranchContext } from '../lib/utils/branch-context';
import { frontendCacheWipeAll } from '../lib/cache-invalidate/frontend-invalidate-requests';
import { requestSitemapUpdate } from '../lib/sitemap/sitemap';
import { updateScheduledPublishJobs } from '../lib/cache-invalidate/scheduled-publish-updater';
import { generateUUID } from '../lib/utils/uuid';
import { removeUnpublishedFromAllContentLists } from '../lib/contentlists/remove-unpublished';

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
            frontendCacheWipeAll(`manual-wipe-${generateUUID()}`);
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
};

type Params = {
    cmd: keyof typeof validActions;
};

export const get = (req: XP.Request) => {
    const { cmd } = req.params as Params;

    const actionToRun = validActions[cmd];

    if (actionToRun) {
        taskLib.executeFunction({
            description: actionToRun.description,
            func: () => {
                runInBranchContext(actionToRun.callback, 'master');
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

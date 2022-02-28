import taskLib from '/lib/xp/task';
import thymeleafLib from '/lib/thymeleaf';
import { runOfficeInfoUpdateTask } from '../lib/officeInformation';
import { runInBranchContext } from '../lib/utils/branch-context';
import { frontendCacheWipeAll } from '../lib/headless/frontend-cache-revalidate';
import { requestSitemapUpdate } from '../lib/sitemap/sitemap';
import { updateScheduledPublishJobs } from '../lib/cache-invalidate/scheduled-publish-updater';

const view = resolve('webapp.html');
const validActions = {
    norg: {
        description: 'Oppdater kontor-info fra norg',
        callback: () => runOfficeInfoUpdateTask(false),
    },
    wipeCache: {
        description: 'Slett frontend-cache',
        callback: () => {
            frontendCacheWipeAll();
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

import taskLib from '/lib/xp/task';
import thymeleafLib from '/lib/thymeleaf';
import { updateOfficeInfo } from '../lib/officeInformation';
import { runInBranchContext } from '../lib/utils/branch-context';
import { wipeAllCaches } from '../lib/siteCache';
import { frontendCacheWipeAll } from '../lib/headless/frontend-cache-revalidate';

const view = resolve('webapp.html');
const validActions = {
    norg: { description: 'Importerer NORG', callback: updateOfficeInfo },
    wipeCache: {
        description: 'Slett cache (XP og frontend)',
        callback: () => {
            wipeAllCaches();
            frontendCacheWipeAll();
        },
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
    };
};

const taskLib = require('/lib/xp/task');
const thymeleafLib = require('/lib/thymeleaf');
const { runInBranchContext } = require('/lib/utils/branch-context');
const officeInformation = require('/lib/officeInformation');

const view = resolve('webapp.html');
const validActions = {
    norg: { description: 'Importerer NORG', callback: officeInformation.runOneTimeJob },
};

exports.get = (req) => {
    const { cmd } = req.params;

    const actionToRun = validActions[cmd];

    if (actionToRun) {
        taskLib.submit({
            description: actionToRun.description,
            task: () => {
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

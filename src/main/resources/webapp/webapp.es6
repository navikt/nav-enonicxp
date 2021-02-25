const libs = {
    context: require('/lib/xp/context'),
    officeInformation: require('/lib/officeInformation'),
    portal: require('/lib/xp/portal'),
    task: require('/lib/xp/task'),
    thymeleaf: require('/lib/thymeleaf'),
    cache: require('/lib/siteCache'),
    updateRepo: require('/lib/migration/updateRepo'),
};
const view = resolve('webapp.html');
const validActions = {
    norg: { description: 'Importerer NORG', callback: libs.officeInformation.runOneTimeJob },
    addFacets: {
        description: 'Legg til fasetter til innehold som ikke har dem',
        callback: libs.updateRepo.facetifier,
    },
};
const runTask = (callback) => {
    libs.context.run(
        {
            repository: 'com.enonic.cms.default',
            branch: 'master',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        function () {
            callback();
        }
    );
};

exports.get = (req) => {
    // check if any cmd is set to run
    const cmd = req.params.cmd;
    let runningCmd = '';
    if (Object.keys(validActions).indexOf(cmd) !== -1) {
        const currentCmd = validActions[cmd];
        runningCmd = cmd;
        libs.task.submit({
            description: currentCmd.description,
            task: () => {
                runTask(currentCmd.callback);
            },
        });
    }

    const model = {
        actionUrl: '/webapp/' + app.name,
        cmds: Object.keys(validActions).map((key) => {
            return { cmd: key, description: validActions[key].description };
        }),
        runningCmd,
    };
    return {
        body: libs.thymeleaf.render(view, model),
    };
};

exports.post = (req) => {};

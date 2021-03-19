const contextLib = require('/lib/xp/context');

const isValidBranch = (branch) =>
    ({
        master: true,
        draft: true,
    }[branch]);

const runInBranchContext = (func, branch = 'master') => {
    if (!isValidBranch(branch)) {
        log.info(`Attempted to run in an invalid branch context: ${branch}`);
        return null;
    }

    return contextLib.run(
        {
            repository: 'com.enonic.cms.default',
            branch: branch,
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        func
    );
};

const getBranchFromMacroContext = (context) => {
    const body = context.request?.body;
    if (body) {
        return JSON.parse(body).branch || context.request.branch;
    }

    return context.request?.branch;
};

module.exports = { runInBranchContext, isValidBranch, getBranchFromMacroContext };

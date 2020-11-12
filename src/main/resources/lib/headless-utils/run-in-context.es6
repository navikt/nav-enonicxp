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

module.exports = { runInBranchContext, isValidBranch };

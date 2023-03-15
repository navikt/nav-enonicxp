import { runOfficeBranchFetchTask } from '../../lib/officeBranch';

// Used for health check - do not remove
export const get = (req: XP.Request) => {
    const { branch = 'master' } = req.params;
    runOfficeBranchFetchTask(false, branch);
    return {
        status: 200,
        body: {
            message: 'Starting one-time import from NORG!',
        },
        contentType: 'application/json',
    };
};

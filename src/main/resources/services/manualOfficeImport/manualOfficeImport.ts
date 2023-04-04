import { runOfficeBranchFetchTask } from '../../lib/officeBranch';

// Used for manual import of office branches from NORG.
// To be put behind auth before we go into production.
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

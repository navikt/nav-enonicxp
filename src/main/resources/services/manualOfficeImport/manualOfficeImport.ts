import { runOfficeBranchFetchTask } from '../../lib/officeBranch';

// Used for health check - do not remove
export const get = () => {
    runOfficeBranchFetchTask();
    return {
        status: 200,
        body: {
            message: 'Starting one-time import from NORG!',
        },
        contentType: 'application/json',
    };
};

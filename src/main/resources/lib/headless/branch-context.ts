import contextLib, { ContextAttributes } from '/lib/xp/context';
import { RepoBranch } from '../../types/common';

const branches = {
    master: true,
    draft: true,
};

export const isValidBranch = (branch: RepoBranch): branch is RepoBranch =>
    branches[branch];

export const runInBranchContext = <ReturnType>(
    func: () => ReturnType,
    branch: RepoBranch = 'master'
): ReturnType => {
    return contextLib.run<ReturnType, ContextAttributes>(
        {
            repository: 'com.enonic.cms.default',
            branch: branch,
            user: {
                login: 'su',
                idProvider: 'system',
            },
            principals: ['role:system.admin'],
        },
        func
    );
};

import contextLib, { ContextAttributes } from '/lib/xp/context';
import { Branch } from '../../types/branch';

const branches = {
    master: true,
    draft: true,
};

export const isValidBranch = (branch: Branch): branch is Branch =>
    branches[branch];

export const runInBranchContext = <ReturnType>(
    func: () => ReturnType,
    branch: Branch = 'master'
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

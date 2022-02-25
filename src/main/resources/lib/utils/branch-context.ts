import contextLib, { ContextAttributes } from '/lib/xp/context';
import { RepoBranch } from '../../types/common';
import { contentRepo } from '../constants';

const branches: { [key in RepoBranch]: boolean } = {
    master: true,
    draft: true,
};

export const isValidBranch = (branch: string): branch is RepoBranch =>
    branches[branch as RepoBranch];

export const runInBranchContext = <ReturnType>(
    func: () => ReturnType,
    branch: RepoBranch = 'master'
): ReturnType => {
    return contextLib.run<ReturnType, ContextAttributes>(
        {
            repository: contentRepo,
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

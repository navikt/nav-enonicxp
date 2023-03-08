import { RepoBranch } from '../../types/common';

const branches: { [key in RepoBranch]: boolean } = {
    master: true,
    draft: true,
};

export const isValidBranch = (branch: string): branch is RepoBranch =>
    branches[branch as RepoBranch];

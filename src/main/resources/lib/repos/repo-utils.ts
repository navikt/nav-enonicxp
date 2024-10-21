import * as nodeLib from '/lib/xp/node';
import { ConnectParams } from '/lib/xp/node';
import { ADMIN_PRINCIPAL, CONTENT_REPO_PREFIX, SUPER_USER } from '../constants';

const asAdminParams: Pick<ConnectParams, 'user' | 'principals'> = {
    user: {
        login: SUPER_USER,
    },
    principals: [ADMIN_PRINCIPAL],
};

type Params = Omit<ConnectParams, 'user' | 'principals'> & { asAdmin?: boolean };

export const getRepoConnection = ({ repoId, branch, asAdmin }: Params) =>
    nodeLib.connect({
        repoId,
        branch,
        ...(asAdmin && asAdminParams),
    });

export const getContentProjectIdFromRepoId = (repoId: string) =>
    repoId.replace(`${CONTENT_REPO_PREFIX}.`, '');

export const isDraftAndMasterSameVersion = (contentId: string, repoId: string) => {
    const draftContent = getRepoConnection({ branch: 'draft', repoId }).get(contentId);
    const masterContent = getRepoConnection({ branch: 'master', repoId }).get(contentId);

    return draftContent?._versionKey === masterContent?._versionKey;
};

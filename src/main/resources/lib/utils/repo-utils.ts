import * as nodeLib from '/lib/xp/node';
import { Source } from '/lib/xp/node';
import { CONTENT_REPO_PREFIX } from '../constants';

const asAdminParams: Pick<Source, 'user' | 'principals'> = {
    user: {
        login: 'su',
    },
    principals: ['role:system.admin'],
};

type Params = Omit<Source, 'user' | 'principals'> & { asAdmin?: boolean };

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

import * as nodeLib from '/lib/xp/node';
import { Source } from '/lib/xp/node';

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

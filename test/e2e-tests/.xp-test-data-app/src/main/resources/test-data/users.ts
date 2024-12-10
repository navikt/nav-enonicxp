import * as authLib from '/lib/xp/auth';
import { SYSTEM_ID_PROVIDER, SYSTEM_USER, SYSTEM_USER_PRINCIPAL } from '@constants';

export const initSystemUsers = () => {
    authLib.createUser({
        name: SYSTEM_USER,
        idProvider: SYSTEM_ID_PROVIDER,
        email: 'system.user@nav.no',
    });

    authLib.addMembers('role:cms.cm.app', [SYSTEM_USER_PRINCIPAL]);
};

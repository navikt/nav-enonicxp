import * as contextLib from '/lib/xp/context';
import { ContextParams } from '/lib/xp/context';
import { ADMIN_PRINCIPAL, SUPER_USER, SYSTEM_ID_PROVIDER } from '@constants';

const adminParams: ContextParams = {
    user: {
        login: SUPER_USER,
        idProvider: SYSTEM_ID_PROVIDER,
    },
    principals: [ADMIN_PRINCIPAL],
};

export const runAsAdmin = <ReturnType>(
    func: (...args: unknown[]) => ReturnType,
    contextParams?: ContextParams
): ReturnType => {
    return contextLib.run<ReturnType>({ ...adminParams, ...contextParams }, func);
};

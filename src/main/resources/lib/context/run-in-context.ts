import * as contextLib from '/lib/xp/context';
import { ContextAttributes, RunContext } from '/lib/xp/context';
import { RepoBranch } from '../../types/common';
import { ADMIN_PRINCIPAL, SUPER_USER, SYSTEM_ID_PROVIDER, SYSTEM_USER } from '../constants';

export type RunInContextOptions = {
    branch?: RepoBranch;
    asAdmin?: boolean;
} & Omit<RunContext<ContextAttributes>, 'branch' | 'user' | 'principals'>;

type ContextAuthInfo = Pick<RunContext<ContextAttributes>, 'user' | 'principals'>;

const adminContextOptions: ContextAuthInfo = {
    user: {
        login: SUPER_USER,
        idProvider: SYSTEM_ID_PROVIDER,
    },
    principals: [ADMIN_PRINCIPAL],
} as const;

const standardContextOptions: ContextAuthInfo = {
    user: {
        login: SYSTEM_USER,
        idProvider: SYSTEM_ID_PROVIDER,
    },
} as const;

export const runInContext = <ReturnType>(
    { branch, repository, asAdmin, attributes }: RunInContextOptions,
    func: () => ReturnType
): ReturnType => {
    const currentContext = contextLib.get();

    return contextLib.run<ReturnType, ContextAttributes>(
        {
            ...currentContext,
            ...(attributes && { attributes: { ...currentContext.attributes, ...attributes } }),
            ...(asAdmin ? adminContextOptions : standardContextOptions),
            repository: repository || currentContext.repository,
            branch: branch || currentContext.branch,
        },
        func
    );
};

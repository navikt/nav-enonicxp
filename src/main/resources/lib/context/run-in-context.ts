import contextLib, { ContextAttributes, RunContext } from '/lib/xp/context';
import { RepoBranch } from '../../types/common';

type ContextOptions = {
    branch?: RepoBranch;
    repository?: string;
    asAdmin?: boolean;
};

const adminContextOptions: Pick<RunContext<ContextAttributes>, 'user' | 'principals'> = {
    user: {
        login: 'su',
        idProvider: 'system',
    },
    principals: ['role:system.admin'],
};

export const runInContext = <ReturnType>(
    { branch, repository, asAdmin }: ContextOptions,
    func: () => ReturnType
): ReturnType => {
    const currentContext = contextLib.get();

    return contextLib.run<ReturnType, ContextAttributes>(
        {
            ...currentContext,
            ...(asAdmin && adminContextOptions),
            repository: repository || currentContext.repository,
            branch: branch || currentContext.branch,
        },
        func
    );
};

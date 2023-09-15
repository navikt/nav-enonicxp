import * as contextLib from '/lib/xp/context';
import { ContextAttributes, RunContext } from '/lib/xp/context';
import { RepoBranch } from '../../types/common';

export type RunInContextOptions = {
    branch?: RepoBranch;
    asAdmin?: boolean;
} & Omit<RunContext<ContextAttributes>, 'branch' | 'user' | 'principals'>;

type ContextAuthInfo = Pick<RunContext<ContextAttributes>, 'user' | 'principals'>;

const adminContextOptions: ContextAuthInfo = {
    user: {
        login: 'su',
        idProvider: 'system',
    },
    principals: ['role:system.admin'],
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
            ...(asAdmin
                ? adminContextOptions
                : {
                      principals: [
                          ...currentContext.authInfo.principals,
                          'role:cms.project.navno-engelsk.editor',
                          'role:cms.project.navno-nynorsk.editor',
                          'role:cms.project.navno-samisk.editor',
                      ],
                  }),
            repository: repository || currentContext.repository,
            branch: branch || currentContext.branch,
        },
        func
    );
};

import * as contextLib from '/lib/xp/context';
import { ContextParams } from '/lib/xp/context';
import { RepoBranch } from '../../types/common';
import {
    ADMIN_PRINCIPAL,
    CONTENT_REPO_PREFIX,
    CONTENT_ROOT_REPO_ID,
    SUPER_USER,
    SYSTEM_ID_PROVIDER,
    SYSTEM_USER,
} from '../constants';

// XP8 no longer sets a repository/branch on the default context (e.g. in main.ts, listeners, tasks).
// XP7 defaulted to the root content repo and the draft branch, so we fall back to the same values.
export const getContextRepoId = (): string => contextLib.get().repository || CONTENT_ROOT_REPO_ID;

export const getContextBranch = (): RepoBranch =>
    (contextLib.get().branch as RepoBranch | undefined) || 'draft';

export type RunInContextOptions = {
    branch?: RepoBranch;
    asAdmin?: boolean;
    asCurrentUser?: boolean;
} & Omit<ContextParams, 'branch' | 'user' | 'principals'>;

type ContextAuthInfo = Pick<ContextParams, 'user' | 'principals'>;

const superUserOptions: ContextAuthInfo = {
    user: {
        login: SUPER_USER,
        idProvider: SYSTEM_ID_PROVIDER,
    },
    principals: [ADMIN_PRINCIPAL],
} as const;

// XP8 requires a project role (or admin role) to read content from the draft branch. We give the
// system user the viewer role for the context project on the draft branch, to keep the draft read
// access it had in XP7. Master is left as-is, as the role also grants read access via content permissions.
const getSystemUserOptions = (repoId: string, branch: RepoBranch): ContextAuthInfo => ({
    user: {
        login: SYSTEM_USER,
        idProvider: SYSTEM_ID_PROVIDER,
    },
    ...(branch === 'draft' &&
        repoId.startsWith(`${CONTENT_REPO_PREFIX}.`) && {
            principals: [
                `role:cms.project.${repoId.replace(`${CONTENT_REPO_PREFIX}.`, '')}.viewer`,
            ],
        }),
});

export const runInContext = <ReturnType>(
    { branch, repository, asAdmin, asCurrentUser, attributes }: RunInContextOptions,
    func: () => ReturnType
): ReturnType => {
    const currentContext = contextLib.get();
    const repositoryActual = repository || getContextRepoId();
    const branchActual = branch || getContextBranch();

    const userOptions = asAdmin
        ? superUserOptions
        : !asCurrentUser
          ? getSystemUserOptions(repositoryActual, branchActual)
          : {};

    return contextLib.run<ReturnType>(
        {
            ...currentContext,
            ...(attributes && { attributes: { ...currentContext.attributes, ...attributes } }),
            ...userOptions,
            repository: repositoryActual,
            branch: branchActual,
        },
        func
    );
};

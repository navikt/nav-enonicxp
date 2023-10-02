import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { isValidBranch } from '../../lib/context/branches';
import { ReferencesFinder } from '../../lib/reference-search/references-finder';

export const get = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
        };
    }

    const { id, repoId, branch, deepSearch, timeout } = req.params;

    if (typeof id !== 'string' || typeof repoId !== 'string' || !branch || !isValidBranch(branch)) {
        return {
            status: 400,
        };
    }

    const contentReferencesFinder = new ReferencesFinder({
        branch,
        repoId,
        withDeepSearch: deepSearch === 'true',
        contentId: id,
        timeout: Number(timeout),
    });

    const start = Date.now();

    const refs = contentReferencesFinder.run();

    const duration = Date.now() - start;

    return {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            duration,
            count: refs?.length,
            refs: refs?.map((ref) => ({
                id: ref._id,
                path: ref._path,
                name: ref.displayName,
            })),
        }),
    };
};

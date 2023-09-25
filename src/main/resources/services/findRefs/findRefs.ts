import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { findReferencesOld } from '../../lib/cache/find-references-old';
import { isValidBranch } from '../../lib/context/branches';
import { ContentReferencesFinder } from '../../lib/cache/content-references-finder';

export const get = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
        };
    }

    const { id, repoId, branch, deepSearch, v2, timeout } = req.params;

    if (typeof id !== 'string' || typeof repoId !== 'string' || !branch || !isValidBranch(branch)) {
        return {
            status: 400,
        };
    }

    const newImpl = new ContentReferencesFinder({
        branch,
        repoId,
        withDeepSearch: deepSearch === 'true',
        contentId: id,
        timeout: Number(timeout),
    });

    const start = Date.now();

    const refs =
        v2 === 'true'
            ? newImpl.run()
            : findReferencesOld({ id, branch, withDeepSearch: deepSearch === 'true' });

    const duration = Date.now() - start;

    return {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            duration,
            count: refs?.length,
            refs: refs?.map((ref: any) => ({
                id: ref._id,
                path: ref._path,
                name: ref.displayName,
            })),
        }),
    };
};

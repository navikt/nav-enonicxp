import nodeLib, { RepoNode } from '/lib/xp/node';
import thymeleafLib from '/lib/thymeleaf';
import { sanitize } from '/lib/xp/common';
import { forceArray, getParentPath } from '../../../../lib/utils/nav-utils';
import { validateCurrentUserPermissionForContent } from '../../../../lib/utils/auth-utils';

type ArchiveEntry = {
    name: string;
    id: string;
};

const view = resolve('./archive-query-response.html');

const queryArchive = ({ query, repoId }: { query?: string; repoId: string }): ArchiveEntry[] => {
    const repo = nodeLib.connect({ repoId, branch: 'draft' });

    const queryString = `_path LIKE "/archive/*"${
        query ? ` AND fulltext("displayName, _path", "${sanitize(query)}*", "AND")` : ''
    }`;

    const archivedContentIds = repo
        .query({
            count: 10000,
            query: queryString,
            sort: '_path ASC',
        })
        .hits.map((node) => node.id);

    const archivedContents = repo.get(archivedContentIds);

    return forceArray(archivedContents)
        .reduce((acc, content) => {
            if (
                !validateCurrentUserPermissionForContent(undefined, 'PUBLISH', content._permissions)
            ) {
                return acc;
            }

            const path = content._path.replace(/^\/archive/, '');

            return [
                ...acc,
                {
                    name: `${content.displayName} [${path}]`,
                    id: content._id,
                    path,
                },
            ];
        }, [])
        .sort((a: RepoNode<any>, b: RepoNode<any>) =>
            (getParentPath(a.path) || a.path).toLowerCase() <
            (getParentPath(b.path) || b.path).toLowerCase()
                ? -1
                : 1
        );
};

export const archiveQueryResponse = (req: XP.Request) => {
    const { repositoryId } = req;
    const { input } = req.params;
    const archiveEntries = queryArchive({ query: input, repoId: repositoryId });

    const model = {
        archiveEntries: archiveEntries.length > 0 ? archiveEntries : null,
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html; charset=UTF-8',
    };
};

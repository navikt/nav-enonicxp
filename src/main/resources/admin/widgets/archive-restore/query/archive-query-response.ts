import { getRepoConnection } from '../../../../lib/utils/repo-utils';
import { RepoNode } from '/lib/xp/node';
import thymeleafLib from '/lib/thymeleaf';
import { sanitize } from '/lib/xp/common';
import { forceArray } from '../../../../lib/utils/array-utils';
import { validateCurrentUserPermissionForContent } from '../../../../lib/utils/auth-utils';
import { batchedNodeQuery } from '../../../../lib/utils/batched-query';
import { isUUID } from '../../../../lib/utils/uuid';
import { getParentPath } from '../../../../lib/paths/path-utils';

type ArchiveEntry = {
    name: string;
    id: string;
};

const view = resolve('./archive-query-response.html');

const buildQueryString = (query?: string) => {
    const archivePathQuery = '_path LIKE "/archive/*"';

    if (!query) {
        return archivePathQuery;
    }

    if (isUUID(query)) {
        return `${archivePathQuery} AND _id="${query}"`;
    }

    return `${archivePathQuery} AND fulltext("displayName, _path", "${sanitize(query)}*", "AND")`;
};

const queryArchive = ({ query, repoId }: { query?: string; repoId: string }): ArchiveEntry[] => {
    const repo = getRepoConnection({ repoId, branch: 'draft' });

    const archivedContentIds = batchedNodeQuery({
        repo,
        queryParams: {
            query: buildQueryString(query),
            sort: '_path ASC',
        },
    }).hits.map((node) => node.id);

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

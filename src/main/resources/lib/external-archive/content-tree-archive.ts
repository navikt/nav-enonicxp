import { RepoConnection } from '/lib/xp/node';
import { getParentPath } from '../paths/path-utils';
import { logger } from '../utils/logging';
import { Content } from '/lib/xp/content';

export const getContentFromArchive = (path: string, repo: RepoConnection) => {
    const parentPath = getParentPath(path);
    const name = path.split('/').pop();

    const archivedResult = repo.query({
        count: 1,
        sort: {
            field: '_ts',
            direction: 'DESC',
        },
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'originalParentPath',
                            values: [parentPath],
                        },
                    },
                    {
                        hasValue: {
                            field: 'originalName',
                            values: [name],
                        },
                    },
                ],
            },
        },
    });

    if (archivedResult.total === 0) {
        return null;
    }

    if (archivedResult.total > 1) {
        logger.error(`Found ${archivedResult.total} hits in the archive for ${path}`);
    }

    const content = repo.get<Content>(archivedResult.hits[0].id);
    if (!content) {
        return null;
    }
};

import { ContentDescriptor } from '../../types/content-types/content-config';
import { Content } from '/lib/xp/content';
import { RepoConnection } from '/lib/xp/node';
import { stripPathPrefix } from '../paths/path-utils';
import { isContentLocalized } from '../localization/locale-utils';
import { NON_LOCALIZED_QUERY_FILTER } from '../localization/layers-repo-utils/localization-state-filters';

export type ContentTreeEntry = {
    id: string;
    versionId: string;
    path: string;
    name: string;
    displayName: string;
    type: ContentDescriptor;
    locale: string;
    numChildren: number;
    isLocalized: boolean;
    hasLocalizedDescendants: boolean;
    isEmpty?: boolean;
};

const hasLocalizedDescendants = (content: Content, repo: RepoConnection) => {
    const result = repo.query({
        count: 0,
        query: {
            like: {
                field: '_path',
                value: `${content._path}/*`,
            },
        },
        filters: {
            boolean: {
                mustNot: NON_LOCALIZED_QUERY_FILTER,
            },
        },
    });

    return result.total > 0;
};

export const transformToContentTreeEntry = (
    content: Content & { versionId: string },
    repo: RepoConnection,
    locale: string
): ContentTreeEntry => {
    const childrenResult = repo.findChildren({
        parentKey: content._id,
        countOnly: true,
    });

    return {
        id: content._id,
        versionId: content.versionId,
        path: stripPathPrefix(content._path),
        name: content._name,
        displayName: content.displayName,
        type: content.type,
        locale,
        numChildren: childrenResult.total,
        isLocalized: isContentLocalized(content),
        hasLocalizedDescendants: hasLocalizedDescendants(content, repo),
    };
};

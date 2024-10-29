import { Content } from '/lib/xp/content';
import { getNavnoContentPath, stripPathPrefix } from '../../../lib/paths/path-utils';
import { validateServiceSecretHeader } from '../../../lib/utils/auth-utils';
import { ContentDescriptor } from '../../../types/content-types/content-config';
import { getLayersData, isValidLocale } from '../../../lib/localization/layers-data';
import { getRepoConnection } from '../../../lib/utils/repo-utils';
import { RepoConnection } from '/lib/xp/node';
import { forceArray } from '../../../lib/utils/array-utils';
import { logger } from '../../../lib/utils/logging';

type ContentTreeEntry = {
    id: string;
    path: string;
    name: string;
    displayName: string;
    type: ContentDescriptor;
    numChildren: number;
};

// TODO: implement pagination with smaller chunks
const MAX_CHILDREN_COUNT = 1000;

const transformToContentTreeEntry = (content: Content, repo: RepoConnection): ContentTreeEntry => {
    const childrenResult = repo.findChildren({
        parentKey: content._id,
        countOnly: true,
    });

    return {
        id: content._id,
        path: stripPathPrefix(content._path),
        name: content._name,
        displayName: content.displayName,
        type: content.type,
        numChildren: childrenResult.total,
    };
};

const getContentTreeChildren = (path: string, repo: RepoConnection): ContentTreeEntry[] => {
    const findChildrenResult = repo.findChildren({
        parentKey: getNavnoContentPath(path),
        count: MAX_CHILDREN_COUNT,
    });

    if (findChildrenResult.total > MAX_CHILDREN_COUNT) {
        logger.error(
            `Found ${findChildrenResult.total} children count exceeds the maximum ${MAX_CHILDREN_COUNT}!`
        );
    }

    const ids = findChildrenResult.hits.map((hit) => hit.id);

    const childContents = repo.get<Content>(ids);

    return forceArray(childContents).map((content) => transformToContentTreeEntry(content, repo));
};

type Params = Partial<{
    path: string;
    locale: string;
}>;

export const externalArchiveContentTreeGet = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const { path, locale } = req.params as Params;

    if (!path) {
        return {
            status: 400,
            body: {
                message: 'Parent path not specified',
            },
            contentType: 'application/json',
        };
    }

    if (!isValidLocale(locale)) {
        return {
            status: 400,
            body: {
                message: `Locale ${locale} is not valid`,
            },
            contentType: 'application/json',
        };
    }

    const repo = getRepoConnection({
        repoId: getLayersData().localeToRepoIdMap[locale],
        branch: 'draft',
        asAdmin: true,
    });

    const parentContent = repo.get<Content>({ key: getNavnoContentPath(path) });

    if (!parentContent) {
        return {
            status: 404,
            body: {
                message: `Not found: ${path}`,
            },
            contentType: 'application/json',
        };
    }

    return {
        status: 200,
        body: {
            current: transformToContentTreeEntry(parentContent, repo),
            children: getContentTreeChildren(path, repo),
        },
        contentType: 'application/json',
    };
};

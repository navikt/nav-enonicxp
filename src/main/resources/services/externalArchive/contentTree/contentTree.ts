import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getNavnoContentPath, stripPathPrefix } from '../../../lib/paths/path-utils';
import { validateServiceSecretHeader } from '../../../lib/utils/auth-utils';
import { ContentDescriptor } from '../../../types/content-types/content-config';

type ContentTreeEntry = {
    id: string;
    path: string;
    name: string;
    displayName: string;
    type: ContentDescriptor;
    numChildren: number;
};

const transformToContentTreeEntry = (content: Content): ContentTreeEntry => {
    const childrenResult = contentLib.getChildren({
        key: content._id,
        count: 0,
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

const getContentTreeChildren = (path: string) => {
    const children = contentLib.getChildren({ key: getNavnoContentPath(path), count: 1000 }).hits;
    return children.map(transformToContentTreeEntry);
};

type Params = Partial<{
    path: string;
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

    const { path } = req.params as Params;

    if (!path) {
        return {
            status: 400,
            body: {
                message: 'Parent path not specified',
            },
            contentType: 'application/json',
        };
    }

    const parentContent = contentLib.get({ key: getNavnoContentPath(path) });

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
            current: transformToContentTreeEntry(parentContent),
            children: getContentTreeChildren(path),
        },
        contentType: 'application/json',
    };
};

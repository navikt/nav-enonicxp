import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getNavnoContentPath, stripPathPrefix } from '../../lib/paths/path-utils';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';

type ContentTreeEntry = {
    id: string;
    path: string;
    displayName: string;
};

const transformToContentTreeEntry = (content: Content): ContentTreeEntry => {
    return {
        id: content._id,
        path: stripPathPrefix(content._path),
        displayName: content.displayName,
    };
};

const getContentTreeChildren = (path: string) => {
    const children = contentLib.getChildren({ key: getNavnoContentPath(path) }).hits;

    return children.map(transformToContentTreeEntry);
};

type Params = Partial<{
    path: string;
}>;

export const get = (req: XP.Request) => {
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
            content: parentContent,
            children: getContentTreeChildren(path),
        },
        contentType: 'application/json',
    };
};

import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import * as ioLib from '/lib/xp/io';
import { getNavnoContentPath, stripPathPrefix } from '../../../lib/paths/path-utils';
import { validateServiceSecretHeader } from '../../../lib/utils/auth-utils';
import { ContentDescriptor } from '../../../types/content-types/content-config';
import { logger } from '../../../lib/utils/logging';

type ContentTreeEntry = {
    id: string;
    path: string;
    name: string;
    displayName: string;
    type: ContentDescriptor;
    numChildren: number;
    withChildren: boolean;
    children?: ContentTreeEntry[];
    icon?: {
        data: string;
        mimeType: string;
    };
};

const MAX_CHILDREN = 1000;

const getIcon = (type: ContentDescriptor) => {
    const icon = contentLib.getType(type)?.icon;

    if (!icon) {
        return undefined;
    }

    try {
        return {
            data: ioLib.readText(icon.data),
            mimeType: icon.mimeType,
        };
    } catch (e) {
        logger.error(`Failed to read icon data stream - ${e}`);
        return undefined;
    }
};

const transformToContentTreeEntry = (content: Content, withChildren: boolean): ContentTreeEntry => {
    const childrenResult = contentLib.getChildren({
        key: content._id,
        count: withChildren ? MAX_CHILDREN : 0,
    });

    if (childrenResult.total > MAX_CHILDREN) {
        logger.critical(
            `Found more than the max allowed ${MAX_CHILDREN} for content ${content._id}`
        );
    }

    const children = withChildren
        ? childrenResult.hits.map((childContent) =>
              transformToContentTreeEntry(childContent, false)
          )
        : undefined;

    return {
        id: content._id,
        path: stripPathPrefix(content._path),
        name: content._name,
        displayName: content.displayName,
        type: content.type,
        numChildren: childrenResult.total,
        withChildren,
        children,
        icon: getIcon(content.type),
    };
};

const getContentTreeChildren = (path: string) => {
    const children = contentLib.getChildren({ key: getNavnoContentPath(path), count: 1000 }).hits;
    return children.map((content) => transformToContentTreeEntry(content, true));
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
            current: transformToContentTreeEntry(parentContent, false),
            children: getContentTreeChildren(path),
        },
        contentType: 'application/json',
    };
};

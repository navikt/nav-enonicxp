import { Request } from '@enonic-types/core';
import * as contentLib from '/lib/xp/content';
import { logger } from 'lib/utils/logging';
import { forceString } from 'lib/utils/string-utils';

const DEFAULT_ICON_TYPE = 'base:structured';
const defaultIcon = contentLib.getType(DEFAULT_ICON_TYPE)?.icon;

if (!defaultIcon) {
    logger.critical(`No icon found for specified default type ${DEFAULT_ICON_TYPE}`);
}

export const externalArchiveContentIconService = (req: Request) => {
    const type = forceString(req.params.type);

    if (!type) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                msg: 'Parameter "type" is required',
            },
        };
    }

    const typeData = contentLib.getType(type);

    if (!typeData) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                msg: `Type "${type}" is not valid`,
            },
        };
    }

    const icon = typeData.icon || defaultIcon;

    if (!icon) {
        return {
            status: 404,
            contentType: 'application/json',
            body: {
                msg: `No icon found for specified content type ${type}`,
            },
        };
    }

    return {
        status: 200,
        contentType: icon.mimeType,
        body: icon.data,
    };
};

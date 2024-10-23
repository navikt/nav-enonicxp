import * as contentLib from '/lib/xp/content';

export const externalArchiveContentIconGet = (req: XP.Request) => {
    const { type } = req.params;

    if (!type) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                msg: 'Parameter "type" is required',
            },
        };
    }

    const icon = contentLib.getType(type)?.icon;

    if (!icon) {
        return {
            status: 404,
            contentType: 'application/json',
            body: {
                msg: `No icon found for conten type ${type}`,
            },
        };
    }

    return {
        status: 200,
        contentType: icon.mimeType,
        body: icon.data,
    };
};

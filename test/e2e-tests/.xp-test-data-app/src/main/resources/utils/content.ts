import * as contentLib from '/lib/xp/content';
import { CreateContentParams } from '/lib/xp/content';

export const createOrReplace = (params: CreateContentParams<any>) => {
    const { parentPath, name } = params;

    const path = `${parentPath}/${name}`;

    if (contentLib.exists({ key: path })) {
        log.info(`Content on ${path} already exists - deleting`);
        contentLib.delete({ key: path });
    }

    return contentLib.create(params);
};

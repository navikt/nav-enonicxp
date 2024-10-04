import * as contentLib from '/lib/xp/content';
import { CreateContentParams } from '/lib/xp/content';
import { ContentDescriptor } from '../../../../../../src/main/resources/types/content-types/content-config';

type CreateContentParamsWithName<ContentType extends ContentDescriptor> =
    CreateContentParams<ContentType> & Required<Pick<CreateContentParams<ContentType>, 'name'>>;

export const createOrReplace = (params: CreateContentParamsWithName<any>) => {
    const { parentPath, name } = params;

    const path = `${parentPath}/${name}`;

    if (contentLib.exists({ key: path })) {
        log.info(`Content on ${path} already exists - deleting`);
        contentLib.delete({ key: path });
    }

    return contentLib.create(params);
};

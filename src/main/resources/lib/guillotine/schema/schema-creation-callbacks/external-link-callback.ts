import { CreationCallback } from '../../utils/creation-callback-utils';
import { insertOriginalContentTypeField } from './common/original-content-type';

export const externalLinkCallback: CreationCallback = (context, params) => {
    insertOriginalContentTypeField(params);
};

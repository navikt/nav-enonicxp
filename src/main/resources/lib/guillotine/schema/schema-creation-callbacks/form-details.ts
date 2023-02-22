import { CreationCallback } from '../../utils/creation-callback-utils';
import { forceArray } from '../../../utils/nav-utils';

export const formDetailsCallback: CreationCallback = (context, params) => {
    params.fields.applicationVariations.resolve = (env) => {
        return forceArray(env?.source?.applicationVariations);
    };

    params.fields.complaintVariations.resolve = (env) => {
        return forceArray(env?.source?.complaintVariations);
    };
};

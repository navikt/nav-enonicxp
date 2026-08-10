import { Request } from '@enonic-types/core';
import { getAllGlobalValueSet } from '../../../lib/global-values/global-value-utils';
import { gvServiceInvalidRequestResponse } from '../utils';
import { isGlobalValueContentDescriptor } from '../../../lib/global-values/types';

export const getAllGlobalValueSetService = (req: Request) => {
    const type = req.params.type as string;

    if (!isGlobalValueContentDescriptor(type)) {
        return gvServiceInvalidRequestResponse(`Invalid global value set type ${type}`);
    }

    const items = getAllGlobalValueSet(type);
    if (!items) {
        return gvServiceInvalidRequestResponse(`Global value sets of type ${type} not found`);
    }

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            items,
        },
    };
};

import { getGlobalValueSet } from '../../../lib/utils/global-value-utils';
import { gvServiceInvalidRequestResponse } from '../utils';
import { forceArray } from '../../../lib/utils/nav-utils';

export const getGlobalValueSetService = (req: XP.Request) => {
    const { contentId } = req.params;

    const content = getGlobalValueSet(contentId);
    if (!content) {
        return gvServiceInvalidRequestResponse(`Global value set with id ${contentId} not found`);
    }

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            items: forceArray(content.data?.valueItems),
        },
    };
};

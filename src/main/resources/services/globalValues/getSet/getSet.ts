import { getGlobalValueSet } from '../../../lib/global-values/global-value-utils';
import { gvServiceInvalidRequestResponse } from '../utils';
import { forceArray } from '../../../lib/utils/nav-utils';

export const getGlobalValueSetService = (req: XP.Request) => {
    const { contentId } = req.params;

    const content = getGlobalValueSet(contentId);
    if (!content) {
        return gvServiceInvalidRequestResponse(`Global value set with id ${contentId} not found`);
    }

    const type = content.type === 'no.nav.navno:global-value-set' ? 'numberValue' : 'caseTime';
    const items = forceArray(content.data?.valueItems).map((item) => ({ ...item, type }));

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            items,
        },
    };
};

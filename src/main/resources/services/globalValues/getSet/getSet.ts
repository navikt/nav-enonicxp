import { getGlobalValueSet } from '../../../lib/global-values/global-value-utils';
import { gvServiceInvalidRequestResponse } from '../utils';
import { forceArray } from '../../../lib/utils/nav-utils';

export const getGlobalValueSetService = (req: XP.Request) => {
    const { contentId } = req.params;

    const content = getGlobalValueSet(contentId);
    if (!content) {
        return gvServiceInvalidRequestResponse(`Global value set with id ${contentId} not found`);
    }

    // The original implementation of this had only one value type (what is now the "numberValue" type),
    // and therefore did not set the type for each value. Account for this to ensure the frontend receives
    // the correct type for rendering the editor
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

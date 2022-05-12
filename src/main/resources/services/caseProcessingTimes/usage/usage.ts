import { Content } from '/lib/xp/content';
import { gvServiceInvalidRequestResponse } from '../utils';
import { getGlobalValueUsage } from '../../../lib/utils/global-value-utils';

const transformToResponseItem = (content: Content) => ({
    id: content._id,
    path: content._path,
    displayName: content.displayName,
});

export const getGlobalValueUsageService = (req: XP.Request) => {
    const { key, contentId } = req.params;

    if (!key || !contentId) {
        return gvServiceInvalidRequestResponse(
            `Missing parameters:${!key && ' "key"'}${!contentId && ' "contentId"'}`
        );
    }

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            usage: getGlobalValueUsage(key, contentId).map(transformToResponseItem),
        },
    };
};

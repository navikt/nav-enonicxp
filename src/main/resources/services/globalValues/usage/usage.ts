import { Request, Response } from '@enonic-types/core';
import { Content } from '/lib/xp/content';
import { gvServiceInvalidRequestResponse } from '../utils';
import { getGlobalValueUsage } from '../../../lib/global-values/global-value-utils';

const transformToResponseItem = (content: Content) => ({
    id: content._id,
    path: content._path,
    displayName: content.displayName,
});

export const getGlobalValueUsageService = (req: Request): Response => {
    const
        key = req.params.key as string,
        contentId = req.params.contentId as string;

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

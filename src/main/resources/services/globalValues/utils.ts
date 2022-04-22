import {
    insufficientPermissionResponse,
    validateCurrentUserPermissionForContent,
} from '../../lib/utils/auth-utils';

export type GlobalValueInput = {
    contentId: string;
    itemName: string;
    numberValue: number;
};

export const validateGlobalValueInputAndGetErrorResponse = ({
    contentId,
    itemName,
    numberValue,
}: Partial<GlobalValueInput>) => {
    if (!validateCurrentUserPermissionForContent(contentId, 'MODIFY')) {
        return insufficientPermissionResponse('MODIFY');
    }

    const hasValue = numberValue !== undefined;

    if (!contentId || !itemName || !hasValue) {
        return gvServiceInvalidRequestResponse(
            'Missing parameters:' +
                `${!contentId && ' contentId'}` +
                `${!itemName && ' itemName'}` +
                `${!hasValue && ' numberValue'}`
        );
    }

    if (numberValue !== undefined && isNaN(numberValue)) {
        return gvServiceInvalidRequestResponse(`numberValue ${numberValue} must be a number`);
    }

    return null;
};

export const gvServiceInvalidRequestResponse = (msg: string) => ({
    status: 400,
    contentType: 'application/json',
    body: {
        message: `Invalid request: ${msg}`,
        level: 'error',
    },
});

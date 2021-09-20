const {
    validateCurrentUserPermissionForContent,
    insufficientPermissionResponse,
} = require('/lib/auth/auth-utils');

const validateGlobalValueInputAndGetErrorResponse = ({
    contentId,
    itemName,
    textValue,
    numberValue,
}) => {
    if (!validateCurrentUserPermissionForContent(contentId, 'MODIFY')) {
        return insufficientPermissionResponse('MODIFY');
    }

    const hasValue = textValue || numberValue !== undefined;

    if (!contentId || !itemName || !hasValue) {
        return gvServiceInvalidRequestResponse(
            'Missing parameters:' +
                `${!contentId && ' contentId'}` +
                `${!itemName && ' itemName'}` +
                `${!hasValue && ' textValue or numberValue'}`
        );
    }

    if (numberValue !== undefined && isNaN(numberValue)) {
        return gvServiceInvalidRequestResponse(`numberValue ${numberValue} must be a number`);
    }

    return null;
};

const gvServiceInvalidRequestResponse = (msg) => ({
    status: 400,
    contentType: 'application/json',
    body: {
        message: `Invalid request: ${msg}`,
        level: 'error',
    },
});

module.exports = {
    validateGlobalValueInputAndGetErrorResponse,
    gvServiceInvalidRequestResponse,
};

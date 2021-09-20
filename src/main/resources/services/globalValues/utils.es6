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
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                message:
                    'Missing parameters:' +
                    `${!contentId && ' contentId'}` +
                    `${!itemName && ' itemName'}` +
                    `${!hasValue && ' textValue or numberValue'}`,
            },
        };
    }

    if (numberValue !== undefined && isNaN(numberValue)) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                message: `numberValue ${numberValue} must be a number`,
            },
        };
    }

    return null;
};

module.exports = {
    validateGlobalValueInputAndGetErrorResponse,
};

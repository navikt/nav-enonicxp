const contextLib = require('/lib/xp/context');
const contentLib = require('/lib/xp/content');

const insufficientAccessResponse = (requiredPermission) => ({
    status: 403,
    contentType: 'application/json',
    body: {
        message: `Forbidden: ${requiredPermission} access required for this resource`,
    },
});

const validateCurrentUserPermission = (contentId, requiredPermission) => {
    const content = contentLib.getPermissions({ key: contentId });
    if (!content) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                message: 'Invalid content id',
            },
        };
    }

    const currentUserPrincipals = contextLib.get()?.authInfo?.principals;
    if (!currentUserPrincipals) {
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                message: 'Could not retrieve user permissions',
            },
        };
    }

    const allowedPrincipals = content.permissions.reduce((acc, principal) => {
        const hasPermission = principal.allow.some(
            (permission) => permission === requiredPermission
        );

        return hasPermission ? [...acc, principal.principal] : acc;
    }, []);

    log.info(`Allowed principals: ${JSON.stringify(allowedPrincipals)}`);

    const currentUserHasAccess = allowedPrincipals.some((allowedPrincipal) =>
        currentUserPrincipals.some((currentPrincipal) => currentPrincipal === allowedPrincipal)
    );

    return currentUserHasAccess;
};

module.exports = { validateCurrentUserPermission, insufficientAccessResponse };

const contextLib = require('/lib/xp/context');
const contentLib = require('/lib/xp/content');
const authLib = require('/lib/xp/auth');

const insufficientPermissionResponse = (requiredPermission) => ({
    status: 403,
    contentType: 'application/json',
    body: {
        message: `Feil: "${requiredPermission}" tilgang kreves for denne handlingen`,
    },
});

const userIsAdmin = () => authLib.hasRole('role:system.admin');

const validateCurrentUserPermissionForContent = (contentId, requiredPermission) => {
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
                message: 'Error: could not retrieve user permissions',
            },
        };
    }

    const allowedPrincipals = content.permissions.reduce((acc, principal) => {
        const hasPermission = principal.allow.some(
            (permission) => permission === requiredPermission
        );

        return hasPermission ? [...acc, principal.principal] : acc;
    }, []);

    const currentUserHasAccess = allowedPrincipals.some((allowedPrincipal) =>
        currentUserPrincipals.some((currentPrincipal) => currentPrincipal === allowedPrincipal)
    );

    return currentUserHasAccess;
};

module.exports = {
    validateCurrentUserPermissionForContent,
    insufficientPermissionResponse,
    userIsAdmin,
};

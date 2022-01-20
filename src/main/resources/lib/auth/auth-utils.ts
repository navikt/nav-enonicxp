import authLib from '*/lib/xp/auth';
import contentLib, { Permission } from '*/lib/xp/content';
import contextLib from '*/lib/xp/context';

export const insufficientPermissionResponse = (requiredPermission: string) => ({
    status: 403,
    contentType: 'application/json',
    body: {
        message: `Feil: ${requiredPermission} tilgang kreves for denne handlingen`,
        level: 'error',
    },
});

export const userIsAdmin = () => authLib.hasRole('role:system.admin');

export const validateCurrentUserPermissionForContent = (
    contentId: string,
    requiredPermission: Permission
) => {
    const contentPermissions = contentLib.getPermissions({ key: contentId });
    if (!contentPermissions) {
        return {
            status: 400,
            contentType: 'application/json',
            body: {
                message: 'Invalid content id',
                level: 'error',
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
                level: 'error',
            },
        };
    }

    const allowedPrincipals = contentPermissions.permissions.reduce(
        (acc, principal) => {
            const hasPermission = principal.allow.some(
                (permission) => permission === requiredPermission
            );

            return hasPermission ? [...acc, principal.principal] : acc;
        },
        []
    );

    const currentUserHasAccess = allowedPrincipals.some((allowedPrincipal) =>
        currentUserPrincipals.some(
            (currentPrincipal) => currentPrincipal === allowedPrincipal
        )
    );

    return currentUserHasAccess;
};

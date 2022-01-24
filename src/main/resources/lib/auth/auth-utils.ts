import authLib from '/lib/xp/auth';
import { Permission } from '*/lib/xp/content';
import { contentLib } from '../xp-libs';
import contextLib from '/lib/xp/context';
import { PrincipalKey } from '*/lib/xp/auth';

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
): boolean => {
    const contentPermissions = contentLib.getPermissions({ key: contentId });
    if (!contentPermissions) {
        return false;
    }

    const currentUserPrincipals = contextLib.get()?.authInfo?.principals;
    if (!currentUserPrincipals) {
        log.warning(
            `Could not retrieve user principals in current context for content ${contentId}`
        );
        return false;
    }

    const allowedPrincipals = contentPermissions.permissions.reduce(
        (acc, principal) => {
            const hasPermission = principal.allow.some(
                (permission) => permission === requiredPermission
            );

            return hasPermission ? [...acc, principal.principal] : acc;
        },
        [] as PrincipalKey[]
    );

    const currentUserHasAccess = allowedPrincipals.some((allowedPrincipal) =>
        currentUserPrincipals.some(
            (currentPrincipal) => currentPrincipal === allowedPrincipal
        )
    );

    return currentUserHasAccess;
};

import { Request } from '@enonic-types/core';
import * as authLib from '/lib/xp/auth';
import * as contentLib from '/lib/xp/content';
import { Permission, AccessControlEntry } from '/lib/xp/content';
import * as contextLib from '/lib/xp/context';
import { logger } from './logging';
import { ADMIN_PRINCIPAL, LOGGED_IN_PRINCIPAL } from '../constants';

export const insufficientPermissionResponse = (requiredPermission: string) => ({
    status: 403,
    contentType: 'application/json',
    body: {
        message: `Feil: ${requiredPermission} tilgang kreves for denne handlingen`,
        level: 'error',
    },
});

export const userIsLoggedIn = () => authLib.hasRole(LOGGED_IN_PRINCIPAL);

export const userIsAdmin = () => authLib.hasRole(ADMIN_PRINCIPAL);

export const validateCurrentUserPermissionForContent = (
    contentId: string | undefined = undefined,
    requiredPermission: Permission,
    permissions?: AccessControlEntry[]
): boolean => {
    if (!contentId && !permissions) {
        logger.error('contentId or permissions must be provided');
        return false;
    }

    const contentPermissions =
        permissions ||
        (contentId ? contentLib.getPermissions({ key: contentId })?.permissions : null);
    if (!contentPermissions) {
        return false;
    }

    const currentUserPrincipals = contextLib.get()?.authInfo?.principals;
    if (!currentUserPrincipals) {
        logger.error(
            `Could not retrieve user principals in current context for content ${contentId}`
        );
        return false;
    }

    const allowedPrincipals = contentPermissions.reduce<string[]>((acc, principal) => {
        const hasPermission = principal.allow?.some(
            (permission) => permission === requiredPermission
        );

        return hasPermission ? [...acc, principal.principal] : acc;
    }, []);

    return  allowedPrincipals.some((allowedPrincipal) =>
        currentUserPrincipals.some((currentPrincipal) => currentPrincipal === allowedPrincipal)
    );
};

export const validateServiceSecretHeader = (req: Request) =>
    req.headers.secret === app.config.serviceSecret;

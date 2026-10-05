import { Request } from '@enonic-types/core';
import * as authLib from '/lib/xp/auth';
import { logger } from '../lib/utils/logging';
import { validateServiceSecretHeader } from '../lib/utils/auth-utils';
import {
    LAYERS_ANON_USER,
    LAYERS_ID_PROVIDER,
    SUPER_USER,
    SYSTEM_ID_PROVIDER,
} from '../lib/constants';

// Handles auto-login for two kinds of requests:
//
// 1. Non-authenticated requests for files which should be publically availiable. Permissions to
// view our content layers are restricted to certain user groups only, but we want to bypass this
// for published files.
//
// 2. Internal loopback requests to the Guillotine app endpoint from runGuillotineQuery. These run
// as super user, which matches the admin context our queries ran in with lib-guillotine in XP7.
// Requires the service secret header.
export const autoLogin = (req: Request) => {
    if (isGuillotineLoopbackRequest(req)) {
        login(req, SUPER_USER, SYSTEM_ID_PROVIDER);
        return;
    }

    if (!isPublicFileRequest(req)) {
        logger.info(`Unexpected request: ${req.url}`);
        return;
    }

    login(req, LAYERS_ANON_USER, LAYERS_ID_PROVIDER);
};

const login = (req: Request, user: string, idProvider: string) => {
    const result = authLib.login({
        user,
        idProvider,
        skipAuth: true,
        scope: 'REQUEST',
    });

    if (!result.authenticated) {
        logger.error(`Autologin failed on ${req.url} - ${result.message}`);
    }
};

const isPublicFileRequest = (req: Request) =>
    req.mode === 'live' &&
    req.branch === 'master' &&
    req.path.match(/^\/_\/((en|nn|se)\/)?(image|attachment)\//);

const isGuillotineLoopbackRequest = (req: Request) =>
    req.method === 'POST' &&
    /^\/_guillotine\/[^/]+\/(draft|master)\/?$/.test(req.path) &&
    validateServiceSecretHeader(req);

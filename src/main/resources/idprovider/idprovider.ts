import * as authLib from '/lib/xp/auth';
import { logger } from '../lib/utils/logging';
import { LAYERS_ANON_USER, LAYERS_ID_PROVIDER } from '../lib/constants';

// Allows requests for non-authenticated users to files which should be publically availiable
//
// Permissions to view our content layers are restricted to certain user groups only, but we want to
// bypass this for published files.
export const autoLogin = (req: XP.Request) => {
    if (!isPublicFileRequest(req)) {
        logger.info(`Unexpected request: ${req.url}`);
        return;
    }

    const result = authLib.login({
        user: LAYERS_ANON_USER,
        idProvider: LAYERS_ID_PROVIDER,
        skipAuth: true,
        scope: 'REQUEST',
    });

    if (!result.authenticated) {
        logger.error(`Autologin failed on ${req.url} - ${result.message}`);
    }
};

const isPublicFileRequest = (req: XP.Request) =>
    req.mode === 'live' &&
    req.branch === 'master' &&
    req.path.match(/^\/_\/((en|nn|se)\/)?(image|attachment)\//);

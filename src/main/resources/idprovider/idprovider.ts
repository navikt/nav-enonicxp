import * as authLib from '/lib/xp/auth';
import { logger } from '../lib/utils/logging';
import { LAYERS_ANON_USER, LAYERS_ID_PROVIDER } from '../lib/constants';

export const handle401 = (req: XP.Request) => {
    logger.info(`401: ${JSON.stringify(req)}`);

    return {
        status: 200,
        body: {
            type: '401',
            req,
        },
    };
};

export const autoLogin = (req: XP.Request) => {
    logger.info(`Autologin: ${JSON.stringify(req)}`);
    const result = authLib.login({
        user: LAYERS_ANON_USER,
        idProvider: LAYERS_ID_PROVIDER,
        skipAuth: true,
        scope: 'REQUEST',
    });

    const memberships = authLib.getMemberships(
        `user:${LAYERS_ID_PROVIDER}:${LAYERS_ANON_USER}`,
        true
    );

    logger.info(
        `Autologin result: ${JSON.stringify(result)} - principals: ${JSON.stringify(memberships)}`
    );
};

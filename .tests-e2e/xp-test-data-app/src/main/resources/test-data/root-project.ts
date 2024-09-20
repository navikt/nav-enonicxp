import * as projectLib from '/lib/xp/project';
import { APP_DESCRIPTOR, CONTENT_LOCALE_DEFAULT, CONTENT_ROOT_PROJECT_ID } from '@constants';

export const initRootProject = () => {
    projectLib.modifyReadAccess({
        id: CONTENT_ROOT_PROJECT_ID,
        readAccess: {
            public: true,
        },
    });

    try {
        const modifyRes = projectLib.modify({
            id: CONTENT_ROOT_PROJECT_ID,
            displayName: 'nav.no',
            language: CONTENT_LOCALE_DEFAULT,
            siteConfig: [{ applicationKey: APP_DESCRIPTOR }],
        });

        log.info(`Default modify result: ${JSON.stringify(modifyRes)}`);
    } catch (e: any) {
        log.error(`Default modify error: ${e.toString()}`);
    }
};

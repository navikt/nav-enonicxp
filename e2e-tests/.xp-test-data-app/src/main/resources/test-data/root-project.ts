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
        projectLib.modify({
            id: CONTENT_ROOT_PROJECT_ID,
            displayName: 'nav.no',
            language: CONTENT_LOCALE_DEFAULT,
            siteConfig: [{ applicationKey: APP_DESCRIPTOR }],
        });
    } catch (e: any) {
        log.error(`Creating root project ${CONTENT_ROOT_PROJECT_ID} failed - ${e.toString()}`);
    }
};

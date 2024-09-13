import * as projectLib from '/lib/xp/project';
import { CreateProjectParams } from '/lib/xp/project';
import * as contentLib from '/lib/xp/content';
import {
    APP_DESCRIPTOR,
    CONTENT_LOCALE_DEFAULT,
    CONTENT_ROOT_PROJECT_ID,
    NAVNO_ROOT_PATH,
} from './lib/constants';
import { runInContext } from './lib/context/run-in-context';
import { logger } from './lib/utils/logging';
import { pushLayerContentToMaster } from './lib/localization/layers-data';

const layersParams: CreateProjectParams<Record<string, unknown>>[] = [
    {
        id: 'navno-engelsk',
        displayName: 'nav.no engelsk',
        language: 'en',
        readAccess: {
            public: false,
        },
    },
    {
        id: 'navno-nynorsk',
        displayName: 'nav.no nynorsk',
        language: 'nn',
        readAccess: {
            public: false,
        },
    },
];

const initLayers = () => {
    layersParams.forEach((params) =>
        projectLib.create({
            ...params,
            parent: CONTENT_ROOT_PROJECT_ID,
            siteConfig: [{ applicationKey: APP_DESCRIPTOR }],
            permissions: {
                owner: ['user:system:su'],
                author: [],
                editor: [],
                contributor: [],
                viewer: [],
            },
        })
    );
};

const initDefaultProject = () => {
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

        logger.info(`Default modify result: ${JSON.stringify(modifyRes)}`);
    } catch (e: any) {
        logger.error(`Default modify error: ${e.toString()}`);
    }
};

const initTestData = () => {
    logger.info(`Projects: ${JSON.stringify(projectLib.list())}`);

    initDefaultProject();
    initLayers();

    contentLib.create({
        parentPath: '/',
        contentType: 'portal:site',
        data: {},
        name: 'www.nav.no',
    });

    contentLib.create({
        parentPath: NAVNO_ROOT_PATH,
        contentType: 'base:folder',
        name: 'kontor',
        data: {},
    });

    contentLib.publish({
        keys: ['/www.nav.no'],
        includeChildren: true,
    });

    pushLayerContentToMaster(true);
};

if (app.config.env === 'test') {
    logger.critical(
        'Running test init functions - If this ran in prod something is very very wrong!'
    );

    runInContext({ asAdmin: true }, initTestData);
}

import * as projectLib from '/lib/xp/project';
import { CreateProjectParams } from '/lib/xp/project';
import * as contentLib from '/lib/xp/content';
import * as contextLib from '/lib/xp/context';

export const APP_DESCRIPTOR = 'no.nav.navno';
export const CONTENT_ROOT_PROJECT_ID = 'default';
export const CONTENT_LOCALE_DEFAULT = 'no';
export const NAVNO_ROOT_PATH = '/www.nav.no';
export const SYSTEM_ID_PROVIDER = 'system';
export const SUPER_USER = 'su';
export const ADMIN_PRINCIPAL = 'role:system.admin';

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
            parent: 'default',
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

        log.info(`Default modify result: ${JSON.stringify(modifyRes)}`);
    } catch (e: any) {
        log.error(`Default modify error: ${e.toString()}`);
    }
};

export const initTestData = () =>
    contextLib.run(
        {
            user: {
                login: SUPER_USER,
                idProvider: SYSTEM_ID_PROVIDER,
            },
            principals: [ADMIN_PRINCIPAL],
        },
        () => {
            log.info(`Projects: ${JSON.stringify(projectLib.list())}`);

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
        }
    );

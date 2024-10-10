import { CreateProjectParams } from '/lib/xp/project';
import * as projectLib from '/lib/xp/project';
import * as contentLib from '/lib/xp/content';
import {
    APP_DESCRIPTOR,
    CONTENT_REPO_PREFIX,
    CONTENT_ROOT_PROJECT_ID,
    SUPER_USER_PRINCIPAL,
    SYSTEM_USER_PRINCIPAL,
} from '@constants';
import { runAsAdmin } from '../utils/context';
import { PublishContentParams } from '/lib/xp/content';

export const languageToLayer: Record<string, CreateProjectParams<Record<string, unknown>>> = {
    en: {
        id: 'navno-engelsk',
        displayName: 'nav.no engelsk',
        readAccess: {
            public: false,
        },
    },
    nn: {
        id: 'navno-nynorsk',
        displayName: 'nav.no nynorsk',
        readAccess: {
            public: false,
        },
    },
};

export const initLayers = () => {
    Object.keys(languageToLayer).forEach((language) => {
        const layer = languageToLayer[language];

        if (projectLib.get({ id: layer.id })) {
            log.info(`Project ${layer.id} already exists, skipping`);
            return;
        }

        projectLib.create({
            ...layer,
            language,
            parent: CONTENT_ROOT_PROJECT_ID,
            siteConfig: [{ applicationKey: APP_DESCRIPTOR }],
            permissions: {
                owner: [SUPER_USER_PRINCIPAL],
                author: [],
                editor: [SYSTEM_USER_PRINCIPAL],
                contributor: [],
                viewer: [],
            },
        });
    });
};

export const publishToAllLayers = (params: PublishContentParams) => {
    const { keys } = params;

    contentLib.publish(params);

    Object.keys(languageToLayer).forEach((language) => {
        const layer = languageToLayer[language];
        runAsAdmin(
            () => {
                keys.forEach((key) => {
                    const layerContent = contentLib.get({ key });

                    if (!layerContent) {
                        log.warning(`Content ${key} not found in layer ${layer.id}`);
                        return;
                    }

                    if (layerContent.inherit?.indexOf('CONTENT') === -1) {
                        log.info(
                            `Content ${key} is localized to layer ${layer.id} - skipping publish`
                        );
                        return;
                    }

                    const result = contentLib.publish({
                        ...params,
                        keys: [key],
                    });

                    log.info(`Publish result for ${key} in ${layer.id}: ${JSON.stringify(result)}`);
                });
            },
            {
                branch: 'draft',
                repository: `${CONTENT_REPO_PREFIX}.${layer.id}`,
            }
        );
    });
};

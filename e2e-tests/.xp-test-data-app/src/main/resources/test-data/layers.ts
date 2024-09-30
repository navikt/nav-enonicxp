import { CreateProjectParams } from '/lib/xp/project';
import * as projectLib from '/lib/xp/project';
import * as contentLib from '/lib/xp/content';
import {
    APP_DESCRIPTOR,
    CONTENT_REPO_PREFIX,
    CONTENT_ROOT_PROJECT_ID,
    SUPER_USER_PRINCIPAL,
} from '@constants';
import { runAsAdmin } from '../utils/context';
import { PublishContentParams } from '/lib/xp/content';

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

export const initLayers = () => {
    layersParams.forEach((params) => {
        if (projectLib.get({ id: params.id })) {
            log.info(`Project ${params.id} already exists, skipping`);
            return;
        }

        projectLib.create({
            ...params,
            parent: CONTENT_ROOT_PROJECT_ID,
            siteConfig: [{ applicationKey: APP_DESCRIPTOR }],
            permissions: {
                owner: [SUPER_USER_PRINCIPAL],
                author: [],
                editor: [],
                contributor: [],
                viewer: [],
            },
        });
    });
};

export const publishToAllLayers = (params: PublishContentParams) => {
    const { keys } = params;

    contentLib.publish(params);

    layersParams.forEach((layer) => {
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

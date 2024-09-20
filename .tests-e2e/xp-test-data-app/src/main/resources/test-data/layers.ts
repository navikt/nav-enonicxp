import { CreateProjectParams } from '/lib/xp/project';
import * as projectLib from '/lib/xp/project';
import * as contentLib from '/lib/xp/content';
import { APP_DESCRIPTOR, CONTENT_REPO_PREFIX } from '@constants';
import { runAsAdmin } from '../utils/context';

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

export const publishNonLocalized = (key: string, withChildren = false) => {
    layersParams.forEach((layer) => {
        runAsAdmin(
            () => {
                const layerContent = contentLib.get({ key });

                if (!layerContent || !layerContent.inherit?.includes('CONTENT')) {
                    log.info(`Content ${key} is localized to layer ${layer.id} - skipping publish`);
                    return;
                }

                contentLib.publish({ keys: [key], includeChildren: withChildren });
            },
            {
                branch: 'draft',
                repository: `${CONTENT_REPO_PREFIX}:${layer.id}`,
            }
        );
    });
};

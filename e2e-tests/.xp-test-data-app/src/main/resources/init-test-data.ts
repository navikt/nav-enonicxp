import * as contentLib from '/lib/xp/content';
import { NAVNO_ROOT_PATH } from '@constants';
import { initLayers } from './test-data/layers';
import { initRootProject } from './test-data/root-project';
import { runAsAdmin } from './utils/context';
import { createOrReplace } from './utils/content';

export const initTestData = () =>
    runAsAdmin(() => {
        initRootProject();
        initLayers();

        createOrReplace({
            parentPath: '/',
            contentType: 'portal:site',
            name: 'www.nav.no',
            data: {},
        });

        createOrReplace({
            parentPath: NAVNO_ROOT_PATH,
            contentType: 'base:folder',
            name: 'kontor',
            data: {},
        });

        contentLib.publish({ keys: ['/www.nav.no'], includeChildren: true });
    });

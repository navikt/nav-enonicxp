import * as projectLib from '/lib/xp/project';
import { NAVNO_ROOT_PATH } from '@constants';
import { initLayers } from './test-data/layers';
import { initRootProject } from './test-data/root-project';
import { runAsAdmin } from './utils/context';
import { createOrReplace } from './utils/content';

export const initTestData = () =>
    runAsAdmin(() => {
        log.info(`Current projects: ${JSON.stringify(projectLib.list())}`);

        initRootProject();
        initLayers();

        createOrReplace({
            parentPath: '/',
            contentType: 'portal:site',
            data: {},
            name: 'www.nav.no',
        });

        createOrReplace({
            parentPath: NAVNO_ROOT_PATH,
            contentType: 'base:folder',
            name: 'kontor',
            data: {},
        });
    });

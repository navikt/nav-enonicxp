import * as projectLib from '/lib/xp/project';
import * as contentLib from '/lib/xp/content';
import { NAVNO_ROOT_PATH } from '@constants';
import { initLayers, publishNonLocalized } from './test-data/layers';
import { initRootProject } from './test-data/root-project';
import { runAsAdmin } from './utils/context';

export const initTestData = () =>
    runAsAdmin(() => {
        log.info(`Current projects: ${JSON.stringify(projectLib.list())}`);

        initRootProject();
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

        publishNonLocalized('/www.nav.no', true);
    });

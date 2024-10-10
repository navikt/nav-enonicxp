import * as projectLib from '/lib/xp/project';
import { initLayers } from './test-data/layers';
import { initRootProject } from './test-data/root-project';
import { runAsAdmin } from './utils/context';
import { initContents } from './test-data/contents';
import { initSystemUsers } from './test-data/users';

export const initTestData = () =>
    runAsAdmin(() => {
        if (projectLib.list().length > 1) {
            log.info('Already populated with test data - skipping');
            return;
        }

        initSystemUsers();
        initRootProject();
        initLayers();
        initContents();
    });

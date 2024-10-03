import { initLayers } from './test-data/layers';
import { initRootProject } from './test-data/root-project';
import { runAsAdmin } from './utils/context';
import { initContents } from './test-data/contents';

export const initTestData = () =>
    runAsAdmin(() => {
        initRootProject();
        initLayers();
        initContents();
    });

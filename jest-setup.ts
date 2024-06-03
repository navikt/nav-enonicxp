import { Log } from '@enonic/mock-xp';
import './src/main/resources/__test/__mocks/xp-mocks';

declare const global: {
    Java: any;
    log: Log;
};

global.Java = {
    type: () => ({}),
};

global.log = {
    debug: console.debug,
    info: console.log,
    warning: console.warn,
    error: console.error,
};

/* eslint-disable no-console */

import { LibContent, Server } from '@enonic/mock-xp';
import { CONTENT_ROOT_PROJECT_ID } from '../../lib/constants';

const server = new Server({
    loglevel: 'info',
    log: {
        debug: console.debug,
        info: console.log,
        warning: console.warn,
        error: console.error,
    },
})
    .createProject({ projectName: CONTENT_ROOT_PROJECT_ID })
    .setContext({ projectName: CONTENT_ROOT_PROJECT_ID });

const libContent = new LibContent({ server });

jest.mock(
    '/lib/xp/content',
    () => {
        return {
            get: jest.fn((params) => libContent.get(params)),
        };
    },
    { virtual: true }
);

export const xpMocks = {
    server,
    libContent,
};

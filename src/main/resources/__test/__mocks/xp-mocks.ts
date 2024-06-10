import { LibContent, LibContext, LibEvent, LibNode, Server } from '@enonic/mock-xp';
import { CONTENT_ROOT_PROJECT_ID } from '../../lib/constants';

const TEST_SERVER_ENGLISH_PROJECT_ID = 'navno-english';

const server = new Server({
    loglevel: 'info',
    log: {
        debug: () => ({}),
        info: console.log,
        warning: console.warn,
        error: console.error,
    },
})
    .createProject({
        projectName: CONTENT_ROOT_PROJECT_ID,
    })
    .createProject({ projectName: TEST_SERVER_ENGLISH_PROJECT_ID })
    .setContext({ projectName: CONTENT_ROOT_PROJECT_ID });

const libContentMock = new LibContent({ server });
const libNodeMock = new LibNode({ server });
const libContextMock = new LibContext({ server });
const libEventMock = new LibEvent({ server });

jest.mock(
    '/lib/xp/content',
    () => {
        return {
            get: jest.fn((params) => libContentMock.get(params)),
        };
    },
    { virtual: true }
);

jest.mock(
    '/lib/xp/node',
    () => {
        return {
            connect: jest.fn((params) => libNodeMock.connect(params)),
            multiRepoConnect: jest.fn(({ sources }) => libNodeMock.connect(sources[0])),
        };
    },
    { virtual: true }
);

jest.mock(
    '/lib/xp/context',
    () => {
        return {
            get: jest.fn(() => libContextMock.get()),
            run: jest.fn((context, callback) => libContextMock.run(context, callback)),
        };
    },
    { virtual: true }
);

jest.mock(
    '/lib/xp/event',
    () => {
        return {};
    },
    { virtual: true }
);

export const xpMocks = {
    server,
    libContentMock,
    libNodeMock,
    libContextMock,
    libEventMock,
    TEST_SERVER_ENGLISH_PROJECT_ID,
};

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

let container: StartedTestContainer;

export const getXpTestContainer = async (withLogs?: boolean) => {
    if (container) {
        console.log('XP container already running!');
        return container;
    }

    // console.log('Building XP test container...');
    // const container = await GenericContainer.fromDockerfile('./.xp-image').build('xp-test-image');

    console.log('Starting XP test container...');

    container = await new GenericContainer('navno_tests')
        .withReuse()
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage(/.*Finished running main.*/, 1))
        .start();

    if (withLogs) {
        (await container.logs()).on('data', (chunk) => {
            console.log(`[XP container] ${chunk.toString()}`);
        });
    }

    console.log('Installing test data...');

    await container.exec('app.sh add file:///enonic-xp/home/navno-testdata.jar');

    console.log('XP container is ready!');

    return container;
};

export const buildXpUrl = (path: string) => {
    const port = container.getMappedPort(8080);
    return `http://localhost:${port}/${path.replace(/^\//, '')}`;
};

export const fetchFromService = async ({
    serviceName,
    headers = {},
    params = {},
    withSecret,
}: {
    serviceName: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    withSecret?: boolean;
}) => {
    const paramsStr = new URLSearchParams(params).toString();
    const url = buildXpUrl(
        `/_/service/no.nav.navno/${serviceName}${paramsStr ? `?${paramsStr}` : ''}`
    );

    return fetch(url, {
        headers: withSecret ? { ...headers, secret: app.config.serviceSecret } : headers,
    });
};

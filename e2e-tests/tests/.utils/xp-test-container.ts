import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

let container: StartedTestContainer;

export const startXpTestContainer = async (withLogs?: boolean) => {
    if (container) {
        console.log('XP container already running');
        return container;
    }

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

export const stopXpTestContainer = async () => {
    return startXpTestContainer().then((container) => container.stop());
};

export const buildXpUrl = (path: string) => {
    const port = container.getMappedPort(8080);
    return `http://localhost:${port}/${path.replace(/^\//, '')}`;
};

export const buildServiceFetcher = (serviceName: string) => {
    return async ({
        headers = {},
        params = {},
        withSecret,
    }: {
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
};

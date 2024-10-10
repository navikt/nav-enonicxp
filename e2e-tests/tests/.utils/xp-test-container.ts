import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

let container: StartedTestContainer;

export const startXpTestContainer = async () => {
    if (container) {
        return container;
    }

    console.log('Starting XP test container...');

    container = await new GenericContainer('navno_tests')
        .withReuse()
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage(/.*Finished running main.*/, 1))
        .withStartupTimeout(90000)
        .start();

    console.log('Installing test data...');

    await container.exec('app.sh add file:///enonic-xp/home/navno-testdata.jar').then((result) => {
        console.log(`Install test data result: ${result.output} (exit code ${result.exitCode})`);

        if (result.exitCode !== 0) {
            throw Error('Failed to install test data!');
        }
    });

    await awaitContainerLogEntry('Finished generating test data', 10000);

    console.log('XP container is ready!');

    return container;
};

const awaitContainerLogEntry = async (msg: string, timeoutMs: number) => {
    const logs = await container.logs();

    return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(reject, timeoutMs);

        const logWatcher = (chunk: any) => {
            if (chunk.toString().includes(msg)) {
                clearTimeout(timeout);
                logs.off('data', logWatcher);
                resolve();
            }
        };

        logs.on('data', logWatcher);
    });
};

export const stopXpTestContainer = () => {
    return container.stop();
};

export const buildXpUrl = (path: string) => {
    const port = container.getMappedPort(8080);
    return `http://localhost:${port}/${path.replace(/^\//, '')}`;
};

export type ServiceResponse<ResponseType = any> = {
    status: number;
    body: ResponseType;
};

const getBody = async (response: Response) => {
    if (response.headers.get('content-type')?.includes('application/json')) {
        return response.json();
    }

    return response.text();
};

export const buildServiceFetcher = <ResponseType = any>(serviceName: string) => {
    return async ({
        headers = {},
        params = {},
        withSecret,
    }: {
        headers?: Record<string, string>;
        params?: Record<string, string>;
        withSecret?: boolean;
    }): Promise<ServiceResponse<ResponseType>> => {
        const paramsStr = new URLSearchParams(params).toString();
        const url = buildXpUrl(
            `/_/service/no.nav.navno/${serviceName}${paramsStr ? `?${paramsStr}` : ''}`
        );

        const response = await fetch(url, {
            headers: withSecret ? { ...headers, secret: app.config.serviceSecret } : headers,
        });

        return {
            status: response.status,
            body: await getBody(response),
        };
    };
};

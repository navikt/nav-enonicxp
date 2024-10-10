import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

let container: StartedTestContainer;

export const startXpTestContainer = async () => {
    if (container) {
        console.log('XP container already running');
        return container;
    }

    console.log('Starting XP test container...');

    container = await new GenericContainer('navno_tests')
        .withReuse()
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage(/.*Finished running main.*/, 1))
        .withStartupTimeout(90000)
        .start();

    const logs = await container.logs();

    console.log('Installing test data...');

    await container.exec('app.sh add file:///enonic-xp/home/navno-testdata.jar').then((result) => {
        console.log(`Install test data result: ${result.output} (exit code ${result.exitCode})`);

        if (result.exitCode !== 0) {
            throw Error('Failed to install test data!');
        }

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(reject, 10000);

            const logWatcher = (chunk: any) => {
                if (chunk.toString().includes('Finished generating test data')) {
                    console.log('Finished loading test data!');
                    clearTimeout(timeout);
                    logs.off('data', logWatcher);
                    resolve();
                }
            };

            logs.on('data', logWatcher);
        });
    });

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

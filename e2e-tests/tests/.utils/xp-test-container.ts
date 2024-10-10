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
        .withStartupTimeout(75000)
        .start();

    const containerLogger = (chunk: any) => {
        console.log(`[XP test container] ${chunk.toString()}`);
    };

    const logs = await container.logs();

    logs.on('data', containerLogger);

    console.log('Installing test data...');

    const installTestData = container
        .exec('app.sh add file:///enonic-xp/home/navno-testdata.jar')
        .then((result) => {
            console.log(`Install test data result: ${result.output}`);

            if (result.exitCode !== 0) {
                throw Error(`Failed to install test data - exit code ${result.exitCode}`);
            }
        });

    const finishGeneratingTestData = waitForContainerLogEntry(
        'Finished generating test data',
        30000
    );

    await Promise.all([installTestData, finishGeneratingTestData]);

    console.log('XP container is ready!');

    logs.off('data', containerLogger);

    return container;
};

const waitForContainerLogEntry = async (msg: string, timeoutMs: number) => {
    const logs = await container.logs();

    return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            console.error(`Timed out after ${timeoutMs} ms waiting for log entry "${msg}"`);
            reject();
        }, timeoutMs);

        const logWatcher = (chunk: any) => {
            const logMsg = chunk.toString();
            if (logMsg.includes(msg)) {
                console.log(`Log entry ${msg} found in ${logMsg}!`);
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

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

let startedContainer: StartedTestContainer;

export const xpTestContainer = async (withLogs?: boolean) => {
    if (startedContainer) {
        console.log('XP container already running!');
        return startedContainer;
    }

    console.log('Building XP test container...');

    const container = await GenericContainer.fromDockerfile('./.xp-image').build();

    console.log('Waiting for nav.no app to start...');

    startedContainer = await container
        .withReuse()
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage(/.*Finished running main.*/, 1))
        .start();

    if (withLogs) {
        (await startedContainer.logs()).on('data', (chunk) => {
            console.log(chunk.toString());
        });
    }

    console.log('Installing test data...');

    await startedContainer.exec('app.sh add file:///enonic-xp/home/navno-testdata.jar --force');

    console.log('XP container is ready!');

    return startedContainer;
};

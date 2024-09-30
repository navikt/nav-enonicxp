import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

let container: StartedTestContainer;

export const setupXpContainer = async (forceRestart?: boolean) => {
    if (container && !forceRestart) {
        console.log('XP container already running');
        return container;
    }

    console.log('Building XP container...');

    const image = await GenericContainer.fromDockerfile('./.xp-image').build();

    console.log('Waiting for nav.no app to start...');

    container = await image
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage(/.*Finished running main.*/, 1))
        .start();

    console.log('Installing test data...');

    await container.exec('app.sh add file:///enonic-xp/home/navno-testdata.jar --force');

    console.log('XP container is ready!');

    return container;
};

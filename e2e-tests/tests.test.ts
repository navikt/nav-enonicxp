import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

describe('Tester testcontainers', () => {
    let container: StartedTestContainer;

    beforeAll(async () => {
        console.log('Building XP container...');

        const image = await GenericContainer.fromDockerfile('./.xp-image').build();

        console.log('Waiting for nav.no app to start...');

        container = await image
            .withExposedPorts(8080)
            .withWaitStrategy(Wait.forLogMessage(/.*Finished running main.*/, 1))
            .start();

        console.log('Installing test data...');

        await container.exec('app.sh add file:///enonic-xp/home/navno-testdata.jar --force');
    }, 60000);

    afterAll(async () => {
        await container.stop({ timeout: 10000 });
    }, 10000);

    test('App responds to liveness check', async () => {
        const port = container.getMappedPort(8080);

        const isAliveResponse = await fetch(
            `http://localhost:${port}/_/service/no.nav.navno/isAlive`
        );

        expect(isAliveResponse.status).toBe(200);
    });
});

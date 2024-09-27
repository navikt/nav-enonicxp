import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

describe('Tester testcontainers', () => {
    let container: StartedTestContainer;

    beforeAll(async () => {
        const image = await GenericContainer.fromDockerfile('./xp-image').build();
        container = await image
            .withExposedPorts(8080)
            .withWaitStrategy(Wait.forLogMessage(/.*Finished running main.*/, 1))
            .start();
    }, 20000);

    test('App responds to liveness check', async () => {
        const port = container.getMappedPort(8080);

        const isAliveResponse = await fetch(
            `http://localhost:${port}/_/service/no.nav.navno/isAlive`
        );

        expect(isAliveResponse.status).toBe(200);
    }, 20000);
});

import { StartedTestContainer } from 'testcontainers';
import { setupXpContainer } from '../test-utils/setup-xp-container';

describe('Tester testcontainers', () => {
    let container: StartedTestContainer;

    beforeAll(async () => {
        container = await setupXpContainer();
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

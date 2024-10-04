import { xpTestContainer } from './utils/xp-test-container';

const container = await xpTestContainer();

describe('The application is responding', () => {
    const port = container.getMappedPort(8080);

    test('App responds to liveness check', async () => {
        const isAliveResponse = await fetch(
            `http://localhost:${port}/_/service/no.nav.navno/isAlive`
        );

        expect(isAliveResponse.status).toBe(200);
    });
});

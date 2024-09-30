import { xpTestContainer } from './utils/xp-test-container';

const container = await xpTestContainer(true);

describe('The application is responding', () => {
    const port = container.getMappedPort(8080);

    test('App responds to liveness check', async () => {
        const isAliveResponse = await fetch(
            `http://localhost:${port}/_/service/no.nav.navno/isAlive`
        );

        expect(isAliveResponse.status).toBe(200);
    });

    test('Root node is nav.no site', async () => {
        const sitecontentResponse = await fetch(
            `http://localhost:${port}/_/service/no.nav.navno/sitecontent?id=/www.nav.no`,
            { headers: { secret: 'dummyToken' } }
        ).then((res) => res.json());

        console.log(`Response: ${JSON.stringify(sitecontentResponse)}`);

        expect(sitecontentResponse.type).toBe('portal:site');
        expect(sitecontentResponse.displayName).toBe('www.nav.no');
    });
});

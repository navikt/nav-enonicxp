import { buildXpUrl, startXpTestContainer } from '@test-utils/xp-test-container';

await startXpTestContainer();

describe('The application is responding', () => {
    test('App responds to liveness check', async () => {
        const isAliveResponse = await fetch(buildXpUrl('/_/service/no.nav.navno/isAlive'));
        expect(isAliveResponse.status).toBe(200);
    });
});

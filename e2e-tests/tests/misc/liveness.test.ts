import { buildXpUrl, getXpTestContainer } from '@test-utils/xp-test-container';
import { SITECONTENT_404_MSG_PREFIX } from '@constants';

console.log(SITECONTENT_404_MSG_PREFIX);

await getXpTestContainer();

describe('The application is responding', () => {
    test('App responds to liveness check', async () => {
        const isAliveResponse = await fetch(buildXpUrl('/_/service/no.nav.navno/isAlive'));
        expect(isAliveResponse.status).toBe(200);
    });
});

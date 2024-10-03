import { fetchFromService, getXpTestContainer } from '@test-utils/xp-test-container';
import { SITECONTENT_404_MSG_PREFIX } from '@constants';

await getXpTestContainer();

describe('sitecontent service (serves content for the frontend)', () => {
    test('Should get 404 for non-existant content', async () => {
        const response = await fetchFromService({
            serviceName: 'sitecontent',
            params: { id: '/www.nav.no/asdf' },
            withSecret: true,
        });

        const responseMsg = (await response.json()).message;

        expect(response.status).toBe(404);
        expect(responseMsg).toBe(SITECONTENT_404_MSG_PREFIX);
    });

    test('Should get 401 if no api secret specified', async () => {
        const response = await fetchFromService({
            serviceName: 'sitecontent',
            params: { id: '/www.nav.no/' },
        });

        expect(response.status).toBe(401);
    });
});

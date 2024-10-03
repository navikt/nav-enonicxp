import { buildServiceFetcher, startXpTestContainer } from '@test-utils/xp-test-container';
import { SITECONTENT_404_MSG_PREFIX } from '@navno-app/constants';

await startXpTestContainer();

describe('sitecontent service (serves content for the frontend)', () => {
    const fetchFromSitecontent = buildServiceFetcher('sitecontent');

    test('Should get 404 for non-existant content', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/asdf' },
            withSecret: true,
        });

        const responseMsg = (await response.json()).message;

        expect(response.status).toBe(404);
        expect(responseMsg).toBe(SITECONTENT_404_MSG_PREFIX);
    });

    test('Should get 401 if no api secret specified', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/legacy-content/' },
        });

        expect(response.status).toBe(401);
    });

    test('Should return published content', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/legacy-content/main-article' },
            withSecret: true,
        }).then((res) => res.json());

        expect(response.displayName).toBe('Main article test');
    });
});

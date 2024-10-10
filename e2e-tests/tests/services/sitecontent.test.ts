import { buildServiceFetcher, startXpTestContainer } from '@test-utils/xp-test-container';
import { SITECONTENT_404_MSG_PREFIX } from '@navno-app/constants';

await startXpTestContainer();

describe('sitecontent service (serves content for the frontend)', () => {
    const fetchFromSitecontent = buildServiceFetcher('sitecontent');

    test('Should return 404 for non-existing content', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/asdf' },
            withSecret: true,
        });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe(SITECONTENT_404_MSG_PREFIX);
    });

    test('Should return 401 if no api secret specified', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/legacy-content' },
        });

        expect(response.status).toBe(401);
    });

    test('Should return 401 if incorrect api secret specified', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/legacy-content' },
            headers: { secret: 'asdf' },
        });

        expect(response.status).toBe(401);
    });

    test('Should return published content', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/published-content' },
            withSecret: true,
        });

        console.log(response);

        expect(response.body.displayName).toBe('Published content');
    });

    test('Should not return unpublished content for master request', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/unpublished-content' },
            withSecret: true,
        });

        expect(response.status).toBe(404);
    });

    test('Should return unpublished content for draft request', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/unpublished-content', branch: 'draft' },
            withSecret: true,
        });

        expect(response.body.displayName).toBe('Unpublished content');
    });

    test('Should not return prepublished content for master request', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/prepublish-tomorrow' },
            withSecret: true,
        });

        expect(response.status).toBe(404);
    });

    test('Should return prepublished content for draft request', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/prepublish-tomorrow', branch: 'draft' },
            withSecret: true,
        });

        expect(response.body.displayName).toBe('Prepublish for tomorrow');
    });

    test('Should resolve customPath', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/my-custompath' },
            withSecret: true,
        });

        expect(response.body.displayName).toBe('Content with customPath');
    });

    test('Should return a redirect to the customPath from an internal _path', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/content-with-custompath' },
            withSecret: true,
        });

        expect(response.body.type).toBe('no.nav.navno:internal-link');
        expect(response.body.data.target._path).toBe('/my-custompath');
    });

    test('Should not redirect to customPath on draft UUID request', async () => {
        const masterResponse = await fetchFromSitecontent({
            params: { id: '/www.nav.no/my-custompath' },
            withSecret: true,
        });

        const draftResponseNoCustomPath = await fetchFromSitecontent({
            params: { id: masterResponse.body._id, branch: 'draft' },
            withSecret: true,
        });

        expect(draftResponseNoCustomPath.body.displayName).toBe('Content with customPath');
    });

    test('Should get localized content from the english layer with /en path suffix', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/published-content/en' },
            withSecret: true,
        });

        expect(response.body.displayName).toBe('Published content in english!');
        expect(response.body.language).toBe('en');
    });

    test('Should not get non-localized content with /nn path suffix', async () => {
        const response = await fetchFromSitecontent({
            params: { id: '/www.nav.no/published-content/nn' },
            withSecret: true,
        });

        expect(response.status).toBe(404);
    });
});

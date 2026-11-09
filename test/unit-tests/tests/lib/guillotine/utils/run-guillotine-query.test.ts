import httpClient from '/lib/http-client';
import { runGuillotineQuery } from '@navno-app/lib/guillotine/utils/run-guillotine-query';

jest.mock('/lib/http-client', () => ({ __esModule: true, default: { request: jest.fn() } }));
jest.mock('@navno-app/lib/context/run-in-context', () => ({
    getContextRepoId: () => 'com.enonic.cms.navno-nynorsk',
}));
jest.mock('@navno-app/lib/guillotine/utils/forwarded-query-context', () => ({
    FORWARDED_QUERY_CONTEXT_HEADER: 'x-forwarded-query-context',
    buildForwardedQueryContextHeader: () => '',
}));

const ID = '991bd887-052b-4033-830e-9059e16de0ae:9ae06cd491235015fa8a5bd4a8b819c5';

const request = httpClient.request as jest.Mock;

const respondWith = (get: unknown) =>
    request.mockReturnValue({
        status: 200,
        body: JSON.stringify({ data: { guillotine: { get } } }),
    });

describe('runGuillotineQuery', () => {
    test('scopes the query to the context project, the branch and the site', () => {
        respondWith(null);

        runGuillotineQuery({
            query: 'query { guillotine { get(key: "x") { _id } } }',
            branch: 'draft',
        });

        const { url, body } = request.mock.calls[0][0];
        expect(url).toBe('http://localhost:8080/_guillotine');
        expect(JSON.parse(body).query).toBe(
            'query { guillotine(project: "navno-nynorsk", branch: "draft", scopeKey: "/www.nav.no") { get(key: "x") { _id } } }'
        );
    });

    test('joins media URL parts to XP7 URLs and keeps other objects with a path', () => {
        respondWith({
            mediaUrl: {
                path: `/media:attachment/navno-nynorsk:draft/${ID}/fil.pdf`,
                queryString: '?download',
            },
            data: {
                image: {
                    imageUrl: {
                        path: `/media:image/navno-nynorsk:draft/${ID}/width-100/bilde.png`,
                        queryString: '',
                    },
                },
                link: { path: '/no/person', queryString: '?foo' },
            },
            list: [null, 'a'],
        });

        const result = runGuillotineQuery({
            query: 'query { guillotine { get } }',
            branch: 'draft',
        });

        expect(result?.get).toEqual({
            mediaUrl: `/_/attachment/download/${ID}/fil.pdf`,
            data: {
                image: { imageUrl: `/_/image/${ID}/width-100/bilde.png` },
                link: { path: '/no/person', queryString: '?foo' },
            },
            list: ['a'],
        });
    });
});

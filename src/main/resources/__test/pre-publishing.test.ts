import { Request as MockRequest } from '@enonic/mock-xp';
import { xpMocks } from './__mocks/xp-mocks';
import { get as sitecontentGet } from '../services/sitecontent/sitecontent';

const { server } = xpMocks;

describe('Pre-published content should not be exposed through public channels', () => {
    test('Sitecontent', () => {
        const request = new MockRequest({
            repositoryId: server.context.repository,
            path: '/asdf',
            method: 'GET',
            headers: {
                secret: app.config.serviceSecret,
            },
        });

        const response = sitecontentGet(request as XP.Request);

        console.log(`Response: ${JSON.stringify(response)}`);

        expect(response).toBeTruthy();
    });
});

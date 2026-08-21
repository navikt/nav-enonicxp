import { request } from '/lib/http-client';
import { getAzureAdToken } from '@navno-app/lib/utils/azure-ad-token';

const mockedRequest = request as unknown as jest.Mock;

const tokenResponse = (accessToken: string, expiresIn = 3600) => ({
    status: 200,
    body: JSON.stringify({
        access_token: accessToken,
        expires_in: expiresIn,
        token_type: 'Bearer',
    }),
});

describe('getAzureAdToken', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
        // The cache is module-scoped and persists between tests; use a unique scope per test
        // to avoid cross-test cache hits.
        app.config.azureClientId = 'test-client-id';
        app.config.azureClientSecret = 'test-client-secret';
    });

    test('requests a token with client_credentials and returns the access token', () => {
        mockedRequest.mockReturnValue(tokenResponse('token-abc'));

        const token = getAzureAdToken('scope-request');

        expect(token).toBe('token-abc');
        expect(mockedRequest).toHaveBeenCalledTimes(1);

        const params = mockedRequest.mock.calls[0][0];
        expect(params.method).toBe('POST');
        expect(params.contentType).toBe('application/x-www-form-urlencoded');
        expect(params.body).toContain('grant_type=client_credentials');
        expect(params.body).toContain('client_id=test-client-id');
        expect(params.body).toContain('client_secret=test-client-secret');
        expect(params.body).toContain('scope=scope-request');
    });

    test('caches the token and does not re-request on the second call', () => {
        mockedRequest.mockReturnValue(tokenResponse('token-cached'));

        const first = getAzureAdToken('scope-cache');
        const second = getAzureAdToken('scope-cache');

        expect(first).toBe('token-cached');
        expect(second).toBe('token-cached');
        expect(mockedRequest).toHaveBeenCalledTimes(1);
    });

    test('re-requests when the cached token is (near) expired', () => {
        // expires_in below the 60s buffer means the cached token is already considered expired.
        mockedRequest
            .mockReturnValueOnce(tokenResponse('token-expired', 30))
            .mockReturnValueOnce(tokenResponse('token-fresh', 3600));

        const first = getAzureAdToken('scope-expiry');
        const second = getAzureAdToken('scope-expiry');

        expect(first).toBe('token-expired');
        expect(second).toBe('token-fresh');
        expect(mockedRequest).toHaveBeenCalledTimes(2);
    });

    test('returns null and does not cache on a non-200 response', () => {
        mockedRequest.mockReturnValue({ status: 401, message: 'Unauthorized' });

        const first = getAzureAdToken('scope-error');
        const second = getAzureAdToken('scope-error');

        expect(first).toBeNull();
        expect(second).toBeNull();
        // Both calls should attempt a request since failures are not cached.
        expect(mockedRequest).toHaveBeenCalledTimes(2);
    });

    test('returns null when client credentials are missing', () => {
        app.config.azureClientId = '';
        app.config.azureClientSecret = '';

        const token = getAzureAdToken('scope-missing-creds');

        expect(token).toBeNull();
        expect(mockedRequest).not.toHaveBeenCalled();
    });

    test('returns null when no scope is provided', () => {
        const token = getAzureAdToken('');

        expect(token).toBeNull();
        expect(mockedRequest).not.toHaveBeenCalled();
    });
});

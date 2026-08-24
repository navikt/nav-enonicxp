import { request } from '/lib/http-client';
import cacheLib from '/lib/cache';
import { AZURE_AD_TOKEN_URL } from '../constants';
import { logger } from './logging';

// EntraID (Azure AD) client-credentials token helper.
//
// After the migration to Enonic Cloud, calls to Nav APIs go through org-ekstern-proxy and
// must carry an OAuth2 Bearer token. This is machine-to-machine (client_credentials) auth
// against Nav's tenant token endpoint. There is no Nais/azurerator/texas here, so we request
// and cache the token ourselves.
//
// The token is cached per scope until shortly before it expires, so we don't hit EntraID on
// every office-import run (the cron runs every minute in prod).

type TokenResponse = {
    access_token: string;
    expires_in: number;
    token_type: string;
};

type CachedToken = {
    accessToken: string;
    expiresAtMs: number;
};

// Refresh a bit before the real expiry to avoid using a token that expires mid-request.
const EXPIRY_BUFFER_MS = 60 * 1000;

// Cache lives for a long time; freshness is enforced via the stored expiresAtMs, not cache TTL.
const tokenCache = cacheLib.newCache({ size: 10, expire: 60 * 60 * 24 });

const requestNewToken = (scope: string): CachedToken | null => {
    const clientId = app.config.clientId;
    const clientSecret = app.config.clientSecret;

    if (!clientId || !clientSecret) {
        logger.error(
            'AzureAdToken: Missing clientId/clientSecret in app config - cannot request token'
        );
        return null;
    }

    const body = [
        'grant_type=client_credentials',
        `client_id=${encodeURIComponent(clientId)}`,
        `client_secret=${encodeURIComponent(clientSecret)}`,
        `scope=${encodeURIComponent(scope)}`,
    ].join('&');

    const response = request({
        url: AZURE_AD_TOKEN_URL,
        method: 'POST',
        contentType: 'application/x-www-form-urlencoded',
        body,
    });

    if (response.status !== 200 || !response.body) {
        logger.error(
            `AzureAdToken: Failed to acquire token for scope ${scope}: ${response.status} - ${response.message}. Response body: ${response.body || '<empty>'}`
        );
        return null;
    }

    try {
        const parsed = JSON.parse(response.body) as TokenResponse;
        if (!parsed.access_token) {
            logger.error(
                `AzureAdToken: Token response for scope ${scope} did not contain an access_token`
            );
            return null;
        }

        return {
            accessToken: parsed.access_token,
            expiresAtMs: Date.now() + parsed.expires_in * 1000 - EXPIRY_BUFFER_MS,
        };
    } catch (e) {
        logger.error(`AzureAdToken: Failed to parse token response for scope ${scope}: ${e}`);
        return null;
    }
};

// Returns a valid access token for the given scope, or null if one could not be acquired.
// Only successful tokens are cached; failures are not cached so the next run retries.
export const getAzureAdToken = (scope: string): string | null => {
    if (!scope) {
        logger.error(
            'AzureAdToken: No scope provided - set norgProxyTokenScope for the current env in lib/constants.ts or app config'
        );
        return null;
    }

    const cached = tokenCache.getIfPresent<CachedToken>(scope);
    if (cached && cached.expiresAtMs > Date.now()) {
        return cached.accessToken;
    }

    const fresh = requestNewToken(scope);
    if (!fresh) {
        return null;
    }

    tokenCache.put(scope, fresh);
    return fresh.accessToken;
};

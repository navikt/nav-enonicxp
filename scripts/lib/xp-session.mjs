import { parseAuth } from './curated-auth.mjs';
import { fetchXp } from './curated-http.mjs';

export const getXpSessionCookie = async (serviceUrl, auth) => {
    const { username, password } = parseAuth(auth, 'XP');

    const response = await fetchXp(new URL('/_/idprovider/system', serviceUrl), {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'login',
            user: username,
            password,
        }),
    });
    const result = await response.json();
    if (!response.ok || !result.authenticated) {
        throw new Error('Authentication with the XP system provider failed');
    }

    return response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';', 1)[0])
        .join('; ');
};

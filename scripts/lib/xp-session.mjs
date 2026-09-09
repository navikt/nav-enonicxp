export const getXpSessionCookie = async (serviceUrl, auth) => {
    const separatorIndex = auth.indexOf(':');
    if (separatorIndex < 1) {
        throw new Error('XP authentication must use the format user:password');
    }

    const response = await fetch(new URL('/_/idprovider/system', serviceUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'login',
            user: auth.slice(0, separatorIndex),
            password: auth.slice(separatorIndex + 1),
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
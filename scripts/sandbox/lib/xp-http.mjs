import { Agent, request as httpRequest } from 'node:http';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const directAgent = new Agent({ keepAlive: false, proxyEnv: {} });

// A dedicated HTTP agent bypasses Node's process-wide environment proxy dispatcher.
export const directLocalFetch = async (input, options = {}) => {
    const url = new URL(input);
    if (
        url.protocol !== 'http:' ||
        !loopbackHosts.has(url.hostname) ||
        url.username ||
        url.password
    ) {
        throw new Error('Direct local requests require an HTTP loopback URL without credentials');
    }
    const request = new Request(url, {
        ...options,
        signal: options.signal ?? AbortSignal.timeout(30000),
    });
    const body = request.body ? Buffer.from(await request.arrayBuffer()) : undefined;
    return new Promise((resolve, reject) => {
        const outgoing = httpRequest(
            {
                hostname: url.hostname === '[::1]' ? '::1' : '127.0.0.1',
                port: url.port || 80,
                path: `${url.pathname}${url.search}`,
                agent: directAgent,
                method: request.method,
                headers: { ...Object.fromEntries(request.headers), host: url.host },
                signal: request.signal,
            },
            (incoming) => {
                incoming.on('error', reject);
                const status = incoming.statusCode;
                if (status >= 300 && status < 400) {
                    incoming.resume();
                    reject(new Error('Local XP redirects are not permitted'));
                    return;
                }
                const headers = new Headers();
                for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
                    headers.append(incoming.rawHeaders[index], incoming.rawHeaders[index + 1]);
                }
                const chunks = [];
                incoming.on('data', (chunk) => chunks.push(chunk));
                incoming.on('end', () => {
                    resolve(
                        new Response(
                            [204, 205, 304].includes(status) ? null : Buffer.concat(chunks),
                            { status, statusText: incoming.statusMessage, headers }
                        )
                    );
                });
            }
        );
        outgoing.on('error', reject);
        outgoing.end(body);
    });
};

export const fetchXp = (input, options) => {
    const url = new URL(input);
    if (url.username || url.password) {
        throw new Error('XP URLs must not contain credentials; use the authentication prompt');
    }
    if (url.protocol === 'http:' && loopbackHosts.has(url.hostname)) {
        return directLocalFetch(url, options);
    }
    if (url.protocol !== 'https:') {
        throw new Error('Non-local XP requests require HTTPS');
    }
    return fetch(url, { redirect: 'error', ...options });
};

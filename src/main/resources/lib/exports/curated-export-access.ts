import * as authLib from '/lib/xp/auth';
import * as contextLib from '/lib/xp/context';
import { Request, Response } from '@enonic-types/core';
import { userIsAdmin } from '../utils/auth-utils';
import { curatedJsonResponse as jsonResponse, isJsonRequest, isRecord } from './curated-safety';
import {
    createRandomHex,
    deleteExpiredCuratedNodes,
    getCuratedStoreRepo,
    sha256Hex,
} from './curated-export-store';
import { getManifestJob, startManifestJob } from './curated-export-manifest-job';
import {
    get as getSource,
    post as postSource,
} from '../../services/curatedExportSource/curatedExportSource';

// Lets the curated import CLI read from deployed XP instances without a password:
// an admin approves the CLI in the browser, which hands a short-lived one-time code to
// the CLI's loopback server. The CLI exchanges it (with its PKCE verifier) for a read-only
// token. Codes and tokens are stored as SHA-256 hashes in the misc repo, so any cluster
// node can verify them.

const CURATED_EXPORT_TOKEN_HEADER = 'X-Curated-Export-Token';

const TOKEN_ROOT_NAME = 'curated-export-tokens';
const TOKEN_ROOT_PATH = `/${TOKEN_ROOT_NAME}`;
const CODE_LIFETIME_MS = 2 * 60 * 1000;
const TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1000;
const HEX_SHA256 = /^[0-9a-f]{64}$/;
const URL_SAFE_RANDOM = /^[A-Za-z0-9_-]{32,128}$/;

type CredentialType = 'code' | 'token';

type CredentialNode = {
    credentialType: CredentialType;
    userKey: string;
    expiresAtMs: number;
    challenge?: string;
};

const storeCredential = (credential: CredentialNode) => {
    const secret = createRandomHex();
    const repo = getCuratedStoreRepo(TOKEN_ROOT_NAME);
    deleteExpiredCuratedNodes(repo, TOKEN_ROOT_NAME);
    repo.create({ _parentPath: TOKEN_ROOT_PATH, _name: sha256Hex(secret), ...credential });
    // Another cluster node may receive the follow-up request.
    repo.refresh();
    return secret;
};

const readCredential = (secret: unknown, credentialType: CredentialType) => {
    if (typeof secret !== 'string' || !HEX_SHA256.test(secret)) {
        return null;
    }
    const repo = getCuratedStoreRepo(TOKEN_ROOT_NAME);
    const node = repo.get<CredentialNode>(`${TOKEN_ROOT_PATH}/${sha256Hex(secret)}`);
    if (node?.credentialType !== credentialType || node.expiresAtMs <= Date.now()) {
        return null;
    }
    return { repo, node };
};

const getHeader = (req: Request, name: string) => {
    const headers = req.headers || {};
    const key = Object.keys(headers).find((header) => header.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : undefined;
};

const parseUserKey = (userKey: string) => {
    const match = /^user:([^:]+):(.+)$/.exec(userKey);
    return match ? { idProvider: match[1], login: match[2] } : null;
};

const escapeHtml = (value: string) =>
    value.replace(
        /[&<>"']/g,
        (character) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
                character
            ] as string
    );

const htmlResponse = (status: number, body: string, port?: number): Response => {
    const formAction = port ? `'self' http://127.0.0.1:${port}` : `'self'`;
    return {
        status,
        contentType: 'text/html; charset=UTF-8',
        headers: {
            'Cache-Control': 'no-store',
            'X-Frame-Options': 'DENY',
            'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; form-action ${formAction}`,
        },
        body: `<!DOCTYPE html><html lang="no"><head><meta charset="utf-8"><title>Kuratert eksport</title></head><body style="font-family: sans-serif; max-width: 40rem; margin: 3rem auto">${body}</body></html>`,
    };
};

const getAuthorizeParams = (req: Request) => {
    const { state, challenge } = req.params;
    const port = Number(req.params.port);
    if (
        typeof req.params.port !== 'string' ||
        !/^\d{4,5}$/.test(req.params.port) ||
        port < 1024 ||
        port > 65535 ||
        typeof state !== 'string' ||
        !URL_SAFE_RANDOM.test(state) ||
        typeof challenge !== 'string' ||
        !HEX_SHA256.test(challenge)
    ) {
        return null;
    }
    return { port, state, challenge };
};

const handleAuthorize = (req: Request): Response => {
    const params = getAuthorizeParams(req);
    if (!params) {
        return htmlResponse(400, '<p>Ugyldig forespørsel fra importverktøyet.</p>');
    }
    const user = authLib.getUser();
    if (!user) {
        // Not a 401: the ID provider would then start the Entra ID login from this /webapp path,
        // and Entra ID only accepts the admin tool's redirect URI.
        const retryUrl = `authorize?${(['port', 'state', 'challenge'] as const)
            .map((name) => `${name}=${encodeURIComponent(String(params[name]))}`)
            .join('&')}`;
        return htmlResponse(
            200,
            `<h1>Logg inn i XP-admin først</h1>
<p>Du må være innlogget i XP-admin for å gi importverktøyet tilgang.</p>
<p><a href="/admin" target="_blank" rel="noopener noreferrer">Logg inn i XP-admin</a> (åpnes i ny fane), og kom tilbake hit når du er innlogget.</p>
<p><a href="${escapeHtml(retryUrl)}">Prøv igjen</a></p>`
        );
    }
    if (!userIsAdmin()) {
        return htmlResponse(403, '<p>Systemadministrator-tilgang er påkrevd.</p>');
    }

    if (req.method === 'GET') {
        // Post without the query string: XP merges repeated query and form values into arrays.
        const hiddenFields = (['port', 'state', 'challenge'] as const)
            .map(
                (name) =>
                    `<input type="hidden" name="${name}" value="${escapeHtml(String(params[name]))}">`
            )
            .join('');
        return htmlResponse(
            200,
            `<h1>Gi importverktøyet lesetilgang?</h1>
<p>Importverktøyet for kuratert innhold på maskinen din ber om å lese innhold, inkludert upublisert innhold, som ${escapeHtml(user.displayName || user.key)}. Tilgangen varer i to timer.</p>
<p>Godkjenn bare hvis du nettopp startet importen selv.</p>
<form method="post" action="authorize">${hiddenFields}<button type="submit">Godkjenn</button></form>`,
            params.port
        );
    }

    // The approval must come from our own page, not from a cross-site form.
    if (getHeader(req, 'Sec-Fetch-Site') !== 'same-origin') {
        return htmlResponse(403, '<p>Godkjenningen må sendes fra denne siden.</p>');
    }
    const code = storeCredential({
        credentialType: 'code',
        userKey: user.key,
        expiresAtMs: Date.now() + CODE_LIFETIME_MS,
        challenge: params.challenge,
    });
    return {
        status: 303,
        headers: {
            Location: `http://127.0.0.1:${params.port}/callback?code=${code}&state=${encodeURIComponent(params.state)}`,
            'Cache-Control': 'no-store',
        },
    };
};

// The CLI routes answer 403, not 401: XP turns a 401 under /webapp into a redirect to the
// login page, which the CLI can only report as a failed fetch.
const handleTokenExchange = (req: Request): Response => {
    if (req.method !== 'POST' || !isJsonRequest(req)) {
        return jsonResponse(415, { message: 'POST application/json is required' });
    }
    let body: unknown;
    try {
        body = JSON.parse(req.body || '');
    } catch {
        return jsonResponse(400, { message: 'Invalid JSON' });
    }
    if (!isRecord(body) || typeof body.verifier !== 'string') {
        return jsonResponse(400, { message: '"code" and "verifier" are required' });
    }
    const credential = readCredential(body.code, 'code');
    if (credential?.node.challenge !== sha256Hex(body.verifier)) {
        return jsonResponse(403, { message: 'Invalid or expired code' });
    }
    // Deleting the code makes it single-use, also when two exchanges race.
    if (credential.repo.delete(credential.node._id).length !== 1) {
        return jsonResponse(403, { message: 'Invalid or expired code' });
    }
    const expiresAtMs = Date.now() + TOKEN_LIFETIME_MS;
    const token = storeCredential({
        credentialType: 'token',
        userKey: credential.node.userKey,
        expiresAtMs,
    });
    return jsonResponse(200, { token, expiresAt: new Date(expiresAtMs).toISOString() });
};

const runWithToken = (req: Request, handler: (req: Request) => Response): Response => {
    const credential = readCredential(getHeader(req, CURATED_EXPORT_TOKEN_HEADER), 'token');
    const user = credential && parseUserKey(credential.node.userKey);
    if (!user) {
        return jsonResponse(403, { message: 'A valid curated export token is required' });
    }
    // Running as the approving user re-checks their current roles on every request.
    return contextLib.run({ user }, () =>
        userIsAdmin()
            ? handler(req)
            : jsonResponse(403, { message: 'System administrator access is required' })
    );
};

const ROUTE_PATTERN = /\/curated-export\/(authorize|token|manifest|source)$/;

export const handleCuratedExportRequest = (req: Request): Response | null => {
    const route = ROUTE_PATTERN.exec(req.path || '')?.[1];
    if (!route) {
        return null;
    }
    const isPost = req.method === 'POST';
    switch (route) {
        case 'authorize':
            return handleAuthorize(req);
        case 'token':
            return handleTokenExchange(req);
        case 'manifest':
            // Building a manifest outlasts the proxy timeout, so it runs as a polled task.
            return runWithToken(req, isPost ? startManifestJob : getManifestJob);
        case 'source':
            return runWithToken(req, isPost ? postSource : getSource);
    }
    return null;
};

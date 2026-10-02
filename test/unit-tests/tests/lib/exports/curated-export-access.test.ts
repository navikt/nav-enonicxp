// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { createHash, randomFillSync } = jest.requireActual('crypto') as any;

type FakeNode = Record<string, unknown> & { _id: string };

const nodes = new Map<string, FakeNode>();
const fakeRepo = {
    exists: jest.fn((path: string) => path === '/curated-export-tokens' || nodes.has(path)),
    create: jest.fn((node: Record<string, unknown>) => {
        const created = { ...node, _id: `id-${node._name}` };
        nodes.set(`${node._parentPath}/${node._name}`, created);
        return created;
    }),
    refresh: jest.fn(),
    get: jest.fn((path: string) => nodes.get(path) ?? null),
    delete: jest.fn((id: string) => {
        const entry = [...nodes.entries()].find(([, node]) => node._id === id);
        if (!entry) {
            return [];
        }
        nodes.delete(entry[0]);
        return [id];
    }),
    query: jest.fn(() => ({ hits: [] })),
};

jest.mock('@navno-app/lib/repos/misc-repo', () => ({
    getMiscRepoConnection: () => fakeRepo,
}));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { info: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));
jest.mock('@navno-app/lib/exports/curated-export-manifest-job', () => ({
    startManifestJob: jest.fn(() => ({ status: 202, body: 'job' })),
    getManifestJob: jest.fn(() => ({ status: 202, body: 'running' })),
}));
jest.mock('@navno-app/services/curatedExportSource/curatedExportSource', () => ({
    get: jest.fn(() => ({ status: 200, body: 'node' })),
    post: jest.fn(() => ({ status: 200, body: 'batch' })),
}));

import * as authLib from '/lib/xp/auth';
import * as contextLib from '/lib/xp/context';
import { startManifestJob } from '@navno-app/lib/exports/curated-export-manifest-job';
import { get as getSource } from '@navno-app/services/curatedExportSource/curatedExportSource';
import { handleCuratedExportRequest } from '@navno-app/lib/exports/curated-export-access';

const javaTypes: Record<string, unknown> = {
    'java.security.SecureRandom': class {
        nextBytes(bytes: Uint8Array) {
            randomFillSync(bytes);
        }
    },
    'byte[]': function ByteArray(length: number) {
        return new Uint8Array(length);
    },
    'java.security.MessageDigest': {
        getInstance: () => ({
            digest: (bytes: Uint8Array) => createHash('sha256').update(bytes).digest(),
        }),
    },
    'java.lang.String': class {
        constructor(private readonly value: string) {}
        getBytes() {
            return new TextEncoder().encode(this.value);
        }
    },
};
(globalThis as unknown as { Java: { type: (name: string) => unknown } }).Java.type = (name) =>
    javaTypes[name];

const BASE = '/webapp/no.nav.navno/curated-export';
const STATE = 'state-value-that-is-long-enough-123456';
const VERIFIER = 'verifier-value-that-is-long-enough-1234567890';
const CHALLENGE = createHash('sha256').update(VERIFIER).digest('hex');
const ADMIN = { key: 'user:entra:admin@nav.no', displayName: 'Admin' };

const authorizeParams = { port: '50123', state: STATE, challenge: CHALLENGE };

const request = (route: string, overrides: Record<string, unknown> = {}) =>
    handleCuratedExportRequest({
        path: `${BASE}/${route}`,
        method: 'GET',
        params: {},
        headers: {},
        ...overrides,
    } as never);

const approve = () => {
    const response = request('authorize', {
        method: 'POST',
        params: authorizeParams,
        headers: { 'sec-fetch-site': 'same-origin' },
    });
    expect(response?.status).toBe(303);
    const location = new URL(String(response?.headers?.Location));
    expect(location.origin).toBe('http://127.0.0.1:50123');
    expect(location.pathname).toBe('/callback');
    expect(location.searchParams.get('state')).toBe(STATE);
    return location.searchParams.get('code') as string;
};

const exchange = (code: string, verifier = VERIFIER) =>
    request('token', {
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify({ code, verifier }),
    });

const issueToken = () => (exchange(approve())?.body as { token: string }).token;

describe('curated export access', () => {
    beforeEach(() => {
        nodes.clear();
        jest.mocked(authLib.getUser).mockReturnValue(ADMIN as never);
        jest.mocked(authLib.hasRole).mockImplementation((role) => role === 'role:system.admin');
        // mock-xp only knows its own users, so run the callback directly.
        jest.mocked(contextLib.run).mockImplementation((_context, callback) => callback());
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('ignores other webapp paths', () => {
        expect(
            handleCuratedExportRequest({ path: '/webapp/no.nav.navno', params: {} } as never)
        ).toBeNull();
    });

    it('sends anonymous users to login', () => {
        jest.mocked(authLib.getUser).mockReturnValue(null);
        expect(request('authorize', { params: authorizeParams })?.status).toBe(401);
    });

    it('rejects non-admins and invalid handoff parameters', () => {
        expect(request('authorize', { params: { ...authorizeParams, port: '80' } })?.status).toBe(
            400
        );
        expect(
            request('authorize', { params: { ...authorizeParams, challenge: 'x' } })?.status
        ).toBe(400);
        jest.mocked(authLib.hasRole).mockReturnValue(false);
        expect(request('authorize', { params: authorizeParams })?.status).toBe(403);
    });

    it('asks for confirmation before issuing a code', () => {
        const response = request('authorize', { params: authorizeParams });
        expect(response?.status).toBe(200);
        expect(response?.body).toContain('<form method="post" action="authorize">');
        expect(response?.headers?.['X-Frame-Options']).toBe('DENY');
        expect(nodes.size).toBe(0);
    });

    it('rejects parameters repeated in the query string and the form', () => {
        const repeated = Object.fromEntries(
            Object.entries(authorizeParams).map(([name, value]) => [name, [value, value]])
        );
        expect(
            request('authorize', {
                method: 'POST',
                params: repeated,
                headers: { 'Sec-Fetch-Site': 'same-origin' },
            })?.status
        ).toBe(400);
    });

    it('rejects cross-site approvals', () => {
        expect(
            request('authorize', {
                method: 'POST',
                params: authorizeParams,
                headers: { 'Sec-Fetch-Site': 'cross-site' },
            })?.status
        ).toBe(403);
        expect(nodes.size).toBe(0);
    });

    it('stores only hashes of codes and tokens', () => {
        const code = approve();
        const token = issueToken();
        const storedNames = [...nodes.keys()].join(' ');
        expect(storedNames).not.toContain(code);
        expect(storedNames).not.toContain(token);
    });

    it('exchanges a code once, and only with the matching verifier', () => {
        const code = approve();
        expect(exchange(code, 'wrong-verifier')?.status).toBe(401);
        const response = exchange(code);
        expect(response?.status).toBe(200);
        expect((response?.body as { token: string }).token).toMatch(/^[0-9a-f]{64}$/);
        expect(exchange(code)?.status).toBe(401);
    });

    it('expires unused codes', () => {
        jest.useFakeTimers({ now: 0 });
        const code = approve();
        jest.setSystemTime(2 * 60 * 1000);
        expect(exchange(code)?.status).toBe(401);
    });

    it('runs export handlers as the approving user', () => {
        const token = issueToken();
        const response = request('manifest', {
            method: 'POST',
            headers: { 'x-curated-export-token': token },
        });
        expect(response?.body).toBe('job');
        expect(contextLib.run).toHaveBeenCalledWith(
            { user: { idProvider: 'entra', login: 'admin@nav.no' } },
            expect.any(Function)
        );
        expect(request('source', { headers: { 'X-Curated-Export-Token': token } })?.body).toBe(
            'node'
        );
        expect(getSource).toHaveBeenCalled();
        expect(request('manifest', { headers: { 'X-Curated-Export-Token': token } })?.body).toBe(
            'running'
        );
    });

    it('rejects missing, unknown, and expired tokens', () => {
        expect(request('manifest', { method: 'POST' })?.status).toBe(401);
        expect(
            request('source', { headers: { 'X-Curated-Export-Token': 'f'.repeat(64) } })?.status
        ).toBe(401);
        jest.useFakeTimers({ now: 0 });
        const token = issueToken();
        jest.setSystemTime(2 * 60 * 60 * 1000);
        expect(request('source', { headers: { 'X-Curated-Export-Token': token } })?.status).toBe(
            401
        );
        expect(startManifestJob).not.toHaveBeenCalled();
    });

    it('rejects tokens of users who are no longer administrators', () => {
        const token = issueToken();
        jest.mocked(authLib.hasRole).mockReturnValue(false);
        expect(request('source', { headers: { 'X-Curated-Export-Token': token } })?.status).toBe(
            403
        );
        expect(getSource).not.toHaveBeenCalled();
    });

    it('does not use the token endpoint as a data endpoint', () => {
        expect(request('token', { method: 'GET' })?.status).toBe(415);
    });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { randomFillSync } = jest.requireActual('crypto') as any;

type FakeNode = Record<string, unknown> & { _id: string };

const nodes = new Map<string, FakeNode>();
const fakeRepo = {
    exists: jest.fn(() => true),
    create: jest.fn((node: Record<string, unknown>) => {
        const created = { ...node, _id: `id-${node._name}` };
        nodes.set(`${node._parentPath}/${node._name}`, created);
        return created;
    }),
    modify: jest.fn(({ key, editor }: { key: string; editor: (node: FakeNode) => FakeNode }) => {
        const node = nodes.get(key);
        if (!node) {
            throw new Error(`No node at ${key}`);
        }
        nodes.set(key, editor(node));
    }),
    refresh: jest.fn(),
    get: jest.fn((path: string) => nodes.get(path) ?? null),
    delete: jest.fn((id: string) => {
        const entry = [...nodes.entries()].find(([, node]) => node._id === id);
        if (entry) {
            nodes.delete(entry[0]);
        }
        return entry ? [id] : [];
    }),
    query: jest.fn(() => ({ hits: [] })),
};

jest.mock('@navno-app/lib/repos/misc-repo', () => ({
    getMiscRepoConnection: () => fakeRepo,
}));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { info: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));
jest.mock('@navno-app/lib/exports/curated-export-manifest', () => ({
    createCuratedExportManifest: jest.fn(),
}));
jest.mock('/lib/xp/task', () => ({ executeFunction: jest.fn() }));

import * as authLib from '/lib/xp/auth';
import * as contextLib from '/lib/xp/context';
import * as taskLib from '/lib/xp/task';
import { createCuratedExportManifest } from '@navno-app/lib/exports/curated-export-manifest';
import {
    getManifestJob,
    startManifestJob,
} from '@navno-app/lib/exports/curated-export-manifest-job';

(globalThis as unknown as { Java: { type: (name: string) => unknown } }).Java.type = (name) =>
    ({
        'java.security.SecureRandom': class {
            nextBytes(bytes: Uint8Array) {
                randomFillSync(bytes);
            }
        },
        'byte[]': function ByteArray(length: number) {
            return new Uint8Array(length);
        },
    })[name];

const ADMIN = { key: 'user:entra:admin@nav.no', idProvider: 'entra', login: 'admin@nav.no' };
const MANIFEST = { scope: 'full', entries: [] };

const start = (body: unknown = { paths: ['/arbeid'], includeDrafts: true }) =>
    startManifestJob({
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify(body),
        params: {},
        headers: {},
    } as never);

const poll = (job: unknown) => getManifestJob({ method: 'GET', params: { job } } as never);

const runTask = () => {
    const { func } = jest.mocked(taskLib.executeFunction).mock.calls.at(-1)?.[0] as {
        func: () => void;
    };
    func();
};

describe('curated export manifest jobs', () => {
    beforeEach(() => {
        nodes.clear();
        jest.clearAllMocks();
        jest.mocked(authLib.getUser).mockReturnValue(ADMIN as never);
        // mock-xp only knows its own users, so run the callback directly.
        jest.mocked(contextLib.run).mockImplementation((_context, callback) => callback());
        jest.mocked(createCuratedExportManifest).mockReturnValue(MANIFEST as never);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('builds the manifest in a task as the requesting user', () => {
        const response = start();
        expect(response.status).toBe(202);
        const { job } = response.body as { job: string };
        expect(job).toMatch(/^[0-9a-f]{64}$/);
        expect(createCuratedExportManifest).not.toHaveBeenCalled();
        expect(poll(job).status).toBe(202);

        runTask();
        expect(contextLib.run).toHaveBeenCalledWith(
            { user: { idProvider: 'entra', login: 'admin@nav.no' } },
            expect.any(Function)
        );
        expect(createCuratedExportManifest).toHaveBeenCalledWith(['/arbeid'], 'full', {
            seeds: [],
            includeDrafts: true,
        });
        const done = poll(job);
        expect(done.status).toBe(200);
        expect(JSON.parse(done.body as string)).toEqual(MANIFEST);
        // The result is handed out once and then removed.
        expect(poll(job).status).toBe(404);
    });

    it('validates the request before starting a task', () => {
        expect(start({ paths: 'arbeid' }).status).toBe(400);
        expect(
            startManifestJob({ method: 'POST', body: '{}', params: {}, headers: {} } as never)
                .status
        ).toBe(415);
        expect(taskLib.executeFunction).not.toHaveBeenCalled();
        expect(nodes.size).toBe(0);
    });

    it('reports failed builds once', () => {
        jest.mocked(createCuratedExportManifest).mockImplementation(() => {
            throw new Error('boom');
        });
        const { job } = start().body as { job: string };
        runTask();
        const failed = poll(job);
        expect(failed.status).toBe(500);
        expect(failed.body).toEqual({ message: 'Failed to create export manifest: Error: boom' });
        expect(poll(job).status).toBe(404);
    });

    it('hides jobs from other users and after they expire', () => {
        jest.useFakeTimers({ now: 0 });
        const { job } = start().body as { job: string };
        runTask();
        jest.mocked(authLib.getUser).mockReturnValue({ key: 'user:entra:other@nav.no' } as never);
        expect(poll(job).status).toBe(404);
        jest.mocked(authLib.getUser).mockReturnValue(ADMIN as never);
        jest.setSystemTime(30 * 60 * 1000);
        expect(poll(job).status).toBe(404);
    });

    it('rejects malformed job ids', () => {
        expect(poll(undefined).status).toBe(400);
        expect(poll('../curated-export-tokens/x').status).toBe(400);
    });

    it('keeps the manifest out of the search index', () => {
        start();
        const created = fakeRepo.create.mock.calls[0][0] as {
            _indexConfig: { configs: { path: string; config: string }[] };
        };
        expect(created._indexConfig.configs).toContainEqual({ path: 'manifest', config: 'none' });
    });
});

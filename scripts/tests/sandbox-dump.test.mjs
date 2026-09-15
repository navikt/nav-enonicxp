import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createSandboxDump, getDumpOptions } from '../create-sandbox-dump.mjs';

const fixture = () => {
    const calls = [];
    const result = { repositories: [{ versionsErrors: [], branches: [{ errors: [] }] }] };
    const dependencies = {
        verifyTarget: (sandbox) => calls.push(['local', sandbox]),
        getAuth: () => {
            calls.push(['credentials']);
            return 'synthetic:password';
        },
        verifyImportTarget: async (options) => calls.push(['authenticated', options.sandbox]),
        waitForNextPoll: async () => {},
        requestApi: async (url, auth, sandbox, options) => {
            calls.push(['request', url, auth, sandbox, options]);
            return url.endsWith('/system/dump')
                ? { taskId: 'task' }
                : {
                      state: 'FINISHED',
                      progress: { current: 1, total: 1, info: JSON.stringify(result) },
                  };
        },
    };
    return { calls, result, dependencies };
};

test('the separate dump command requires sandbox and name, not credentials in arguments', () => {
    assert.deepEqual(getDumpOptions(['--sandbox', 'target', '--name', 'curated_2026_09_10']), {
        sandbox: 'target',
        name: 'curated_2026_09_10',
    });
    assert.throws(() => getDumpOptions(['--sandbox', '--name']), /Invalid argument/);
    assert.throws(
        () => getDumpOptions(['--management-url', 'https://remote.example']),
        /Invalid argument/
    );
    const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL('../create-sandbox-dump.mjs', import.meta.url))],
        { encoding: 'utf8', env: {} }
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage: pnpm sandbox:dump/);
    assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND/);
});

test('validates the target before requesting credentials and creates only a local native dump', async () => {
    const f = fixture();
    const result = await createSandboxDump(
        { sandbox: 'target', name: 'curated_dump' },
        f.dependencies
    );
    assert.deepEqual(f.calls.slice(0, 3), [
        ['local', 'target'],
        ['credentials'],
        ['authenticated', 'target'],
    ]);
    assert.deepEqual(f.calls[3], [
        'request',
        'http://localhost:4848/system/dump',
        'synthetic:password',
        'target',
        {
            method: 'POST',
            body: JSON.stringify({ name: 'curated_dump', includeVersions: false, archive: true }),
        },
    ]);
    assert.equal(f.calls[4][1], 'http://localhost:4848/task/task');
    assert.match(result.dumpPath, /target\/home\/data\/dump\/curated_dump\.zip$/);
    assert.equal(result.repositoryCount, 1);
});

test('rejects missing or unsafe options without prompting or contacting XP', async () => {
    const f = fixture();
    for (const options of [
        {},
        { name: 'dump' },
        { sandbox: 'target', name: '../dump' },
        { sandbox: '..', name: 'dump' },
    ]) {
        await assert.rejects(createSandboxDump(options, f.dependencies));
    }
    assert.deepEqual(f.calls, []);
});

test('does not request credentials or create a dump when the target is not verified', async () => {
    const f = fixture();
    await assert.rejects(
        createSandboxDump(
            { sandbox: 'target', name: 'dump' },
            {
                ...f.dependencies,
                verifyTarget: () => {
                    throw new Error('Not a safe local target');
                },
            }
        ),
        /Not a safe local target/
    );
    assert.deepEqual(f.calls, []);
});

test('does not create a dump when authenticated local preflight fails', async () => {
    const f = fixture();
    await assert.rejects(
        createSandboxDump(
            { sandbox: 'target', name: 'dump' },
            {
                ...f.dependencies,
                verifyImportTarget: async () => {
                    throw new Error('Import not enabled');
                },
            }
        ),
        /Import not enabled/
    );
    assert.equal(f.calls.filter(([kind]) => kind === 'request').length, 0);
});

test('surfaces native dump errors instead of reporting a completed baseline', async () => {
    const f = fixture();
    f.result.repositories[0].branches[0].errors.push('synthetic dump failure');
    await assert.rejects(
        createSandboxDump({ sandbox: 'target', name: 'dump' }, f.dependencies),
        /XP reported dump errors/
    );
});

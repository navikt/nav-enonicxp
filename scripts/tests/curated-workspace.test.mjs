import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    renameSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { withCuratedWorkspace } from '../lib/curated-workspace.mjs';

const fixture = (t) => {
    const root = resolve(`.curated-workspace-test-${randomUUID()}`);
    mkdirSync(root);
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
};

for (const fail of [false, true]) {
    test(`cleans owned manifest and partial exports on ${fail ? 'failure' : 'success'}`, async (t) => {
        const root = fixture(t);
        writeFileSync(join(root, 'unrelated'), 'keep');
        const run = withCuratedWorkspace(
            { bundle: 'run', outputDirectory: root },
            async ({ manifestPath, exportDirectory }) => {
                writeFileSync(manifestPath, '{}');
                mkdirSync(exportDirectory);
                writeFileSync(join(exportDirectory, 'partial-binary'), 'data');
                if (fail) {
                    throw new Error('extraction failed');
                }
                return 'done';
            }
        );
        if (fail) {
            await assert.rejects(run, /extraction failed/);
        } else {
            assert.equal(await run, 'done');
        }
        assert.deepEqual(readdirSync(root), ['unrelated']);
        assert.equal(readFileSync(join(root, 'unrelated'), 'utf8'), 'keep');
    });
}

test('rejects unsafe names, existing artifacts and symlinks without touching them', async (t) => {
    const root = fixture(t);
    const mustNotRun = () => assert.fail('must not start import');
    for (const bundle of ['../escape', '..', '/absolute', 'nested/run', '', 'a\\b']) {
        await assert.rejects(
            withCuratedWorkspace({ bundle, outputDirectory: root }, mustNotRun),
            /safe directory name/
        );
    }
    mkdirSync(join(root, 'existing'));
    writeFileSync(join(root, 'existing', 'keep'), 'keep');
    writeFileSync(join(root, 'legacy.manifest.json'), '{}');
    symlinkSync(join(root, 'existing'), join(root, 'linked'));
    for (const bundle of ['existing', 'legacy', 'linked']) {
        await assert.rejects(withCuratedWorkspace({ bundle, outputDirectory: root }, mustNotRun));
    }
    await assert.rejects(
        withCuratedWorkspace({ bundle: 'new', outputDirectory: join(root, 'linked') }, mustNotRun),
        /symlink/
    );
    assert.equal(readFileSync(join(root, 'existing', 'keep'), 'utf8'), 'keep');
    assert.equal(readFileSync(join(root, 'legacy.manifest.json'), 'utf8'), '{}');
});

test('does not remove a replacement directory or leave lifecycle listeners installed', async (t) => {
    const root = fixture(t);
    const counts = ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP'].map((event) =>
        process.listenerCount(event)
    );
    await withCuratedWorkspace({ bundle: 'run', outputDirectory: root }, async () => {
        // Keep the original inode allocated, so the replacement cannot reuse it.
        renameSync(join(root, 'run'), join(root, 'moved'));
        mkdirSync(join(root, 'run'));
        writeFileSync(join(root, 'run', 'keep'), 'keep');
    });
    assert.equal(readFileSync(join(root, 'run', 'keep'), 'utf8'), 'keep');
    assert.deepEqual(
        ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP'].map((event) => process.listenerCount(event)),
        counts
    );
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'exit']) {
    test(`cleans up on ${signal}`, (t) => {
        const root = fixture(t);
        const moduleUrl = new URL('../lib/curated-workspace.mjs', import.meta.url).href;
        const result = spawnSync(
            process.execPath,
            [
                '--input-type=module',
                '-e',
                `
                import { writeFileSync } from 'node:fs';
                import { withCuratedWorkspace } from ${JSON.stringify(moduleUrl)};
                await withCuratedWorkspace(
                    { bundle: 'run', outputDirectory: ${JSON.stringify(root)} },
                    async ({ manifestPath }) => {
                        writeFileSync(manifestPath, '{}');
                        ${signal === 'exit' ? 'process.exit(7);' : `process.kill(process.pid, '${signal}');`}
                        await new Promise(() => setInterval(() => {}, 1000));
                    }
                );
                `,
            ],
            { encoding: 'utf8', timeout: 10000 }
        );
        assert.equal(result.error, undefined);
        assert.equal(result.status, { SIGINT: 130, SIGTERM: 143, SIGHUP: 129, exit: 7 }[signal]);
        assert.equal(existsSync(join(root, 'run')), false);
        assert.equal(existsSync(root), true);
    });
}

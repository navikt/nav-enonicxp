import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('a vanished load task is not success even if the expected repositories already exist', () => {
    const harness = fileURLToPath(
        new URL('./fixtures/load-curated-dump-harness.mjs', import.meta.url)
    );
    const result = spawnSync(process.execPath, ['--experimental-vm-modules', harness], {
        encoding: 'utf8',
        timeout: 10000,
        env: {},
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.exitCode, 1);
    assert.equal(output.restarts, 0);
    assert.match(output.logs.join('\n'), /Completion and content integrity are unverified/);
    assert.doesNotMatch(output.logs.join('\n'), /Loaded 3 repositories/);
});

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parseCliJsonOutput } from '../lib/local-xp-target.mjs';
import { readRunningSandbox, readSandboxXpVersion } from '../lib/sandbox-files.mjs';

const tempDirectory = (t) => {
    const root = mkdtempSync(join(tmpdir(), 'curated-sandbox-files-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
};

test('reads the running sandbox and sandbox XP version', (t) => {
    const home = tempDirectory(t);
    assert.equal(readRunningSandbox(home), null);
    mkdirSync(join(home, '.enonic/sandboxes/navno'), { recursive: true });
    writeFileSync(join(home, '.enonic/.enonic'), 'running = "navno"\n');
    writeFileSync(
        join(home, '.enonic/sandboxes/navno/.enonic'),
        'distro = "enonic-xp-mac-arm64-sdk-7.16.6"\n'
    );

    assert.equal(readRunningSandbox(home), 'navno');
    assert.deepEqual(readSandboxXpVersion(join(home, '.enonic/sandboxes/navno')), {
        distro: 'enonic-xp-mac-arm64-sdk-7.16.6',
        version: '7.16.6',
    });
});

test('parses the final JSON document from Enonic CLI output', () => {
    assert.deepEqual(parseCliJsonOutput('{"a":1}'), { a: 1 });
    assert.deepEqual(parseCliJsonOutput('Loading...\n{"b":2}\n'), { b: 2 });
});

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parseCliJsonOutput } from '../lib/local-xp-target.mjs';
import {
    assertSandboxXpVersion,
    readRunningSandbox,
    readSandboxXpVersion,
    setPropertiesEntry,
} from '../lib/sandbox-files.mjs';

const tempDirectory = (t) => {
    const root = mkdtempSync(join(tmpdir(), 'curated-sandbox-files-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
};

test('sets, replaces and removes a single properties entry', (t) => {
    const path = join(tempDirectory(t), 'config/no.nav.navno.cfg');

    assert.equal(setPropertiesEntry(path, 'curatedImportEnabled', 'true'), true);
    assert.equal(readFileSync(path, 'utf8'), 'curatedImportEnabled=true\n');

    writeFileSync(path, 'env=localhost\n\n curatedImportEnabled = false\nxp.other=1\n\n');
    assert.equal(setPropertiesEntry(path, 'curatedImportEnabled', 'true'), true);
    assert.equal(
        readFileSync(path, 'utf8'),
        'env=localhost\n\nxp.other=1\ncuratedImportEnabled=true\n'
    );
    assert.equal(setPropertiesEntry(path, 'curatedImportEnabled', 'true'), false);

    assert.equal(setPropertiesEntry(path, 'curatedImportEnabled', null), true);
    assert.equal(readFileSync(path, 'utf8'), 'env=localhost\n\nxp.other=1\n');
});

test('treats dots in property keys literally', (t) => {
    const path = join(tempDirectory(t), 'system.properties');
    writeFileSync(path, 'xpXsuPassword=keep\nxp.suPassword=old\n');
    setPropertiesEntry(path, 'xp.suPassword', 'new');
    assert.equal(readFileSync(path, 'utf8'), 'xpXsuPassword=keep\nxp.suPassword=new\n');
});

test('reads the running sandbox and sandbox XP version', (t) => {
    const home = tempDirectory(t);
    assert.equal(readRunningSandbox(home), null);
    mkdirSync(join(home, '.enonic/sandboxes/navno'), { recursive: true });
    writeFileSync(join(home, '.enonic/.enonic'), 'running = "navno"\n');
    writeFileSync(
        join(home, '.enonic/sandboxes/navno/.enonic'),
        'distro = "enonic-xp-mac-arm64-sdk-7.16.6"\n'
    );
    const sandboxPath = join(home, '.enonic/sandboxes/navno');

    assert.equal(readRunningSandbox(home), 'navno');
    assert.deepEqual(readSandboxXpVersion(sandboxPath), {
        distro: 'enonic-xp-mac-arm64-sdk-7.16.6',
        version: '7.16.6',
    });
    assert.doesNotThrow(() => assertSandboxXpVersion(sandboxPath, 'navno', '7.16.6'));
    assert.throws(
        () => assertSandboxXpVersion(sandboxPath, 'navno', '7.17.0'),
        /uses XP 7\.16\.6; curated source uses XP 7\.17\.0/
    );
});

test('parses the final JSON document from Enonic CLI output', () => {
    assert.deepEqual(parseCliJsonOutput('{"a":1}'), { a: 1 });
    assert.deepEqual(parseCliJsonOutput('Loading...\n{"b":2}\n'), { b: 2 });
});

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { resolveCuratedSource } from '../lib/curated-environments.mjs';

test('resolves deployed source profiles', () => {
    assert.equal(resolveCuratedSource('prod').origin, 'https://portal-admin.oera.no');
    assert.equal(resolveCuratedSource('dev1').origin, 'https://portal-admin-dev.oera.no');
    assert.equal(resolveCuratedSource('dev2').origin, 'https://portal-admin-q6.oera.no');
});

test('resolves an explicit XP origin', () => {
    const source = resolveCuratedSource('https://xp.example.no/');
    assert.equal(source.origin, 'https://xp.example.no');
    assert.equal(
        source.serviceUrl,
        'https://xp.example.no/_/service/no.nav.navno/curatedExportManifest'
    );
    assert.equal(
        source.sourceServiceUrl,
        'https://xp.example.no/_/service/no.nav.navno/curatedExportSource'
    );
});

test('rejects credentials in a source URL without echoing them', () => {
    assert.throws(
        () => resolveCuratedSource('https://su:synthetic-password@xp.example.no'),
        (error) =>
            /must not contain credentials/.test(error.message) &&
            !error.message.includes('synthetic-password')
    );
});

test('resolves the running local sandbox and XP version', () => {
    const homeDirectory = mkdtempSync(join(tmpdir(), 'curated-source-'));
    const sandboxPath = join(homeDirectory, '.enonic', 'sandboxes', 'navno');
    mkdirSync(sandboxPath, { recursive: true });
    writeFileSync(join(sandboxPath, '.enonic'), 'distro = "enonic-xp-mac-arm64-sdk-7.16.6"\n');

    const source = resolveCuratedSource('navno', { homeDirectory, runningSandbox: 'navno' });
    assert.equal(source.kind, 'local');
    assert.equal(source.version, '7.16.6');
    assert.equal(source.sandboxPath, sandboxPath);
});

test('rejects a local sandbox that is not running', () => {
    const homeDirectory = mkdtempSync(join(tmpdir(), 'curated-source-'));
    const sandboxPath = join(homeDirectory, '.enonic', 'sandboxes', 'navno');
    mkdirSync(sandboxPath, { recursive: true });
    writeFileSync(join(sandboxPath, '.enonic'), 'distro = "enonic-xp-mac-arm64-sdk-7.16.6"\n');

    assert.throws(
        () => resolveCuratedSource('navno', { homeDirectory, runningSandbox: 'other' }),
        /Start source sandbox navno/
    );
});

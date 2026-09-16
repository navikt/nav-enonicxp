import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
    parseAuth,
    encodePropertyValue,
    promptForAuth,
    promptForPassword,
    verifyStoppedTargetAuth,
} from '../lib/xp-auth.mjs';

test('rejects missing usernames and passwords', () => {
    assert.throws(() => parseAuth(':password', 'Source'), /user:password/);
    assert.throws(() => parseAuth('su:', 'Target'), /user:password/);
    assert.throws(() => parseAuth('su:password\nxp.other=true', 'Target'), /user:password/);
});

test('round-trips Java property escaping without changing the target password', (t) => {
    const sandboxPath = mkdtempSync(join(tmpdir(), 'curated-auth-'));
    t.after(() => rmSync(sandboxPath, { recursive: true, force: true }));
    mkdirSync(join(sandboxPath, 'home/config'), { recursive: true });
    const password = ' space\\slash:\u00e6\ud83d\ude00';
    writeFileSync(
        join(sandboxPath, 'home/config/system.properties'),
        `xp.suPassword=${encodePropertyValue(password)}\n`
    );
    assert.doesNotThrow(() => verifyStoppedTargetAuth(sandboxPath, `su:${password}`));
});

test('verifies the configured password for a stopped target sandbox', () => {
    const sandboxPath = mkdtempSync(join(tmpdir(), 'curated-auth-'));
    mkdirSync(join(sandboxPath, 'home/config'), { recursive: true });
    writeFileSync(
        join(sandboxPath, 'home/config/system.properties'),
        'xp.suPassword=correct-password\n'
    );

    assert.doesNotThrow(() => verifyStoppedTargetAuth(sandboxPath, 'su:correct-password'));
    assert.throws(
        () => verifyStoppedTargetAuth(sandboxPath, 'su:wrong-password'),
        /Target authentication failed/
    );
    assert.throws(
        () => verifyStoppedTargetAuth(sandboxPath, 'editor:correct-password'),
        /built-in su user/
    );
});

test('returns credentials collected by the interactive shell prompt', () => {
    const originalInputTty = process.stdin.isTTY;
    const originalErrorTty = process.stderr.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stderr, 'isTTY', { value: true, configurable: true });
    try {
        const auth = promptForAuth('Source', {
            runCommand: () => ({ status: 0, stdout: 'editor:secret' }),
        });
        assert.equal(auth, 'editor:secret');
    } finally {
        Object.defineProperty(process.stdin, 'isTTY', {
            value: originalInputTty,
            configurable: true,
        });
        Object.defineProperty(process.stderr, 'isTTY', {
            value: originalErrorTty,
            configurable: true,
        });
    }
});

test('requires an interactive terminal for credentials', () => {
    const originalInputTty = process.stdin.isTTY;
    const originalErrorTty = process.stderr.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    Object.defineProperty(process.stderr, 'isTTY', { value: false, configurable: true });
    try {
        assert.throws(() => promptForAuth('Source'), /interactive terminal/);
        assert.throws(() => promptForPassword('Target SU password'), /interactive terminal/);
    } finally {
        Object.defineProperty(process.stdin, 'isTTY', {
            value: originalInputTty,
            configurable: true,
        });
        Object.defineProperty(process.stderr, 'isTTY', {
            value: originalErrorTty,
            configurable: true,
        });
    }
});

test('returns a password collected silently by the interactive shell prompt', () => {
    const originalInputTty = process.stdin.isTTY;
    const originalErrorTty = process.stderr.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stderr, 'isTTY', { value: true, configurable: true });
    try {
        const password = promptForPassword('New local SU password', {
            runCommand: () => ({ status: 0, stdout: 'secret' }),
        });
        assert.equal(password, 'secret');
    } finally {
        Object.defineProperty(process.stdin, 'isTTY', {
            value: originalInputTty,
            configurable: true,
        });
        Object.defineProperty(process.stderr, 'isTTY', {
            value: originalErrorTty,
            configurable: true,
        });
    }
});

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
    parseAuth,
    promptForAuth,
    promptForPassword,
    verifyStoppedTargetAuth,
} from '../lib/curated-auth.mjs';

test('rejects missing usernames and passwords', () => {
    assert.throws(() => parseAuth(':password', 'Source'), /user:password/);
    assert.throws(() => parseAuth('su:', 'Target'), /user:password/);
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
        Object.defineProperty(process.stdin, 'isTTY', { value: originalInputTty, configurable: true });
        Object.defineProperty(process.stderr, 'isTTY', { value: originalErrorTty, configurable: true });
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
        Object.defineProperty(process.stdin, 'isTTY', { value: originalInputTty, configurable: true });
        Object.defineProperty(process.stderr, 'isTTY', { value: originalErrorTty, configurable: true });
    }
});
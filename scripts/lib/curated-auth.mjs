import { spawnSync } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const parseAuth = (auth, label) => {
    const separatorIndex = auth.indexOf(':');
    if (separatorIndex < 1 || separatorIndex === auth.length - 1) {
        throw new Error(`${label} authentication must use the format user:password`);
    }
    return {
        username: auth.slice(0, separatorIndex),
        password: auth.slice(separatorIndex + 1),
    };
};

export const verifyStoppedTargetAuth = (sandboxPath, auth) => {
    const { username, password } = parseAuth(auth, 'Target');
    if (username !== 'su') {
        throw new Error('A stopped target sandbox must be authenticated with its built-in su user');
    }
    const properties = readFileSync(join(sandboxPath, 'home/config/system.properties'), 'utf8');
    const configuredPassword = properties.match(/^xp\.suPassword=(.*)$/m)?.[1];
    const supplied = Buffer.from(password);
    const configured = Buffer.from(configuredPassword || '');
    if (supplied.length !== configured.length || !timingSafeEqual(supplied, configured)) {
        throw new Error('Target authentication failed');
    }
};

export const promptForAuth = (label, { runCommand = spawnSync } = {}) => {
    if (!process.stdin.isTTY || !process.stderr.isTTY) {
        throw new Error(`Set ${label === 'Source' ? 'CURATED_SOURCE_AUTH' : 'CURATED_TARGET_AUTH'} to user:password`);
    }
    const result = runCommand(
        '/bin/zsh',
        [
            '-c',
            `read -r "username?${label} username: "; read -r -s "password?${label} password: "; printf '\\n' >&2; printf '%s:%s' "$username" "$password"`,
        ],
        { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] }
    );
    if (result.status !== 0 || !result.stdout || result.stdout.startsWith(':')) {
        throw new Error(`${label} credentials are required`);
    }
    return result.stdout;
};

export const promptForPassword = (label, { runCommand = spawnSync } = {}) => {
    if (!process.stdin.isTTY || !process.stderr.isTTY) {
        throw new Error('Set CURATED_TARGET_AUTH to su:password');
    }
    const result = runCommand(
        '/bin/zsh',
        ['-c', `read -r -s "password?${label}: "; printf '\\n' >&2; printf '%s' "$password"`],
        { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] }
    );
    if (result.status !== 0 || !result.stdout) {
        throw new Error(`${label} is required`);
    }
    return result.stdout;
};
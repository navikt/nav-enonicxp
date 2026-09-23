import { spawnSync } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchXp } from './xp-http.mjs';

export const parseAuth = (auth, label) => {
    const separatorIndex = auth.indexOf(':');
    if (
        separatorIndex < 1 ||
        separatorIndex === auth.length - 1 ||
        // eslint-disable-next-line no-control-regex -- deliberately rejecting control characters in credentials
        /[\u0000-\u001f\u007f]/.test(auth)
    ) {
        throw new Error(`${label} authentication must use the format user:password`);
    }
    return {
        username: auth.slice(0, separatorIndex),
        password: auth.slice(separatorIndex + 1),
    };
};

export const getXpSessionCookie = async (serviceUrl, auth) => {
    const { username, password } = parseAuth(auth, 'XP');
    const response = await fetchXp(new URL('/_/idprovider/system', serviceUrl), {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', user: username, password }),
    });
    const result = await response.json();
    if (!response.ok || !result.authenticated) {
        throw new Error('Authentication with the XP system provider failed');
    }
    return response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';', 1)[0])
        .join('; ');
};

export const encodePropertyValue = (value) =>
    value.replace(/[\\ \u0080-\uffff]/g, (character) =>
        character === '\\' || character === ' '
            ? `\\${character}`
            : `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
    );

const decodePropertyValue = (value) =>
    value.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_match, escaped) => {
        if (escaped.startsWith('u') && escaped.length === 5) {
            return String.fromCharCode(Number.parseInt(escaped.slice(1), 16));
        }
        return { t: '\t', n: '\n', r: '\r', f: '\f' }[escaped] ?? escaped;
    });

export const verifyStoppedTargetAuth = (sandboxPath, auth) => {
    const { username, password } = parseAuth(auth, 'Target');
    if (username !== 'su') {
        throw new Error('A stopped target sandbox must be authenticated with its built-in su user');
    }
    const properties = readFileSync(join(sandboxPath, 'home/config/system.properties'), 'utf8');
    const configuredPassword = properties.match(/^\s*xp\.suPassword\s*[=:]\s*(.*)$/m)?.[1];
    const supplied = Buffer.from(password);
    const configured = Buffer.from(decodePropertyValue(configuredPassword || ''));
    if (supplied.length !== configured.length || !timingSafeEqual(supplied, configured)) {
        throw new Error('Target authentication failed');
    }
};

export const promptForAuth = (label, { runCommand = spawnSync } = {}) => {
    if (!process.stdin.isTTY || !process.stderr.isTTY) {
        throw new Error(`${label} credentials require an interactive terminal`);
    }
    const result = runCommand(
        '/bin/zsh',
        [
            '-c',
            `read -r "username?${label} username: "; IFS= read -r -s "password?${label} password: "; printf '\\n' >&2; printf '%s:%s' "$username" "$password"`,
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
        throw new Error(`${label} requires an interactive terminal`);
    }
    const result = runCommand(
        '/bin/zsh',
        ['-c', `IFS= read -r -s "password?${label}: "; printf '\\n' >&2; printf '%s' "$password"`],
        { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] }
    );
    if (result.status !== 0 || !result.stdout) {
        throw new Error(`${label} is required`);
    }
    return result.stdout;
};

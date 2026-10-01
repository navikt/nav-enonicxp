import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const readRunningSandbox = (homeDirectory) => {
    const cliStatePath = join(homeDirectory, '.enonic', '.enonic');
    if (!existsSync(cliStatePath)) {
        return null;
    }
    return readFileSync(cliStatePath, 'utf8').match(/^running = "([^"]+)"$/m)?.[1] ?? null;
};

export const readSandboxXpVersion = (sandboxPath) => {
    const metadata = readFileSync(join(sandboxPath, '.enonic'), 'utf8');
    const distro = metadata.match(/^distro = "([^"]+)"$/m)?.[1];
    const version = distro?.match(/(\d+\.\d+\.\d+(?:[-.][a-zA-Z0-9]+)?)$/)?.[1];
    if (!distro || !version) {
        throw new Error(`Could not determine the XP distribution from ${sandboxPath}/.enonic`);
    }
    return { distro, version };
};

export const assertSandboxXpVersion = (sandboxPath, sandbox, xpVersion) => {
    const { version } = readSandboxXpVersion(sandboxPath);
    if (version !== xpVersion) {
        throw new Error(
            `Target sandbox ${sandbox} uses XP ${version}; curated source uses XP ${xpVersion}`
        );
    }
};

// Replaces (or with value null, removes) one key in a Java properties file. Returns true on change.
export const setPropertiesEntry = (path, key, value, { mode } = {}) => {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keyPattern = new RegExp(`^\\s*${escapedKey}\\s*[=:]`);
    const body = current
        .split(/\r?\n/)
        .filter((line) => !keyPattern.test(line))
        .join('\n')
        .replace(/\n*$/, '');
    const updated = `${body ? `${body}\n` : ''}${value === null ? '' : `${key}=${value}\n`}`;
    if (updated === current) {
        return false;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, updated);
    if (mode !== undefined) {
        chmodSync(path, mode);
    }
    return true;
};

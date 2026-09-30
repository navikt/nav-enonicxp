import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
        throw new Error(`Could not determine the XP version from ${sandboxPath}/.enonic`);
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

import { spawnSync } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import {
    chmodSync,
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    rmSync,
    rmdirSync,
    writeFileSync,
} from 'node:fs';
import { Agent, request as httpRequest } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// Mirrors src/main/resources/lib/exports/curated-safety.ts; the XP services validate the same rules.
export const CONTENT_ROOT_PATH = '/content/www.nav.no';

export const REQUIRED_PROJECTS = [
    { id: 'default', language: 'no', parents: [] },
    { id: 'navno-engelsk', language: 'en', parents: ['default'] },
    { id: 'navno-nynorsk', language: 'nn', parents: ['default'] },
];

export const PROJECT_REPOSITORIES = Object.fromEntries(
    REQUIRED_PROJECTS.map(({ id }) => [id, `com.enonic.cms.${id}`])
);

export const CURATED_REPOSITORIES = Object.values(PROJECT_REPOSITORIES);

export const CURATED_BRANCHES = ['draft', 'master'];

export const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const isCuratedId = (value) =>
    typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value);

// Used for sandbox, bundle and export names that become directory names.
export const isSafeName = (value) =>
    typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value);

export const isCuratedContentPath = (path) =>
    typeof path === 'string' &&
    (path === CONTENT_ROOT_PATH || path.startsWith(`${CONTENT_ROOT_PATH}/`)) &&
    // eslint-disable-next-line no-control-regex -- deliberately rejecting control characters in paths
    !/[%\\\u0000-\u001f\u007f]/.test(path) &&
    path
        .slice(1)
        .split('/')
        .every((segment) => segment && segment !== '.' && segment !== '..');

const directAgent = new Agent({ keepAlive: false, proxyEnv: {} });

// A dedicated HTTP agent bypasses Node's process-wide environment proxy dispatcher.
export const directLocalFetch = async (input, options = {}) => {
    const url = new URL(input);
    if (
        url.protocol !== 'http:' ||
        !LOOPBACK_HOSTS.has(url.hostname) ||
        url.username ||
        url.password
    ) {
        throw new Error('Direct local requests require an HTTP loopback URL without credentials');
    }
    const request = new Request(url, {
        ...options,
        signal: options.signal ?? AbortSignal.timeout(30000),
    });
    const body = request.body ? Buffer.from(await request.arrayBuffer()) : undefined;
    return new Promise((resolve, reject) => {
        const outgoing = httpRequest(
            {
                hostname: url.hostname === '[::1]' ? '::1' : '127.0.0.1',
                port: url.port || 80,
                path: `${url.pathname}${url.search}`,
                agent: directAgent,
                method: request.method,
                headers: { ...Object.fromEntries(request.headers), host: url.host },
                signal: request.signal,
            },
            (incoming) => {
                incoming.on('error', reject);
                const status = incoming.statusCode;
                if (status >= 300 && status < 400) {
                    incoming.resume();
                    reject(new Error('Local XP redirects are not permitted'));
                    return;
                }
                const headers = new Headers();
                for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
                    headers.append(incoming.rawHeaders[index], incoming.rawHeaders[index + 1]);
                }
                const chunks = [];
                incoming.on('data', (chunk) => chunks.push(chunk));
                incoming.on('end', () => {
                    resolve(
                        new Response(
                            [204, 205, 304].includes(status) ? null : Buffer.concat(chunks),
                            { status, statusText: incoming.statusMessage, headers }
                        )
                    );
                });
            }
        );
        outgoing.on('error', reject);
        outgoing.end(body);
    });
};

export const fetchXp = (input, options) => {
    const url = new URL(input);
    if (url.username || url.password) {
        throw new Error('XP URLs must not contain credentials; use the authentication prompt');
    }
    if (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname)) {
        return directLocalFetch(url, options);
    }
    if (url.protocol !== 'https:') {
        throw new Error('Non-local XP requests require HTTPS');
    }
    return fetch(url, { redirect: 'error', ...options });
};

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

// Marks a wrong username or password, which promptForVerifiedAuth lets the user retype.
const rejectedCredentialsError = (message) =>
    Object.assign(new Error(message), { credentialsRejected: true });

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
    if (response.ok && !result.authenticated) {
        throw rejectedCredentialsError('XP rejected the username or password');
    }
    if (!response.ok) {
        throw new Error(
            `Authentication with the XP system provider failed (HTTP ${response.status}, authenticated: ${Boolean(result.authenticated)})`
        );
    }
    return response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';', 1)[0])
        .join('; ');
};

const CURATED_EXPORT_TOKEN_HEADER = 'X-Curated-Export-Token';

// Local sources log in with a password; deployed sources use a token approved in the browser.
export const getSourceAuthHeaders = async (serviceUrl, auth) =>
    typeof auth?.token === 'string'
        ? { [CURATED_EXPORT_TOKEN_HEADER]: auth.token }
        : { Cookie: await getXpSessionCookie(serviceUrl, auth) };

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
        throw rejectedCredentialsError(
            'A stopped target sandbox must be authenticated with its built-in SU user'
        );
    }
    const properties = readFileSync(join(sandboxPath, 'home/config/system.properties'), 'utf8');
    const configuredPassword = properties.match(/^\s*xp\.suPassword\s*[=:]\s*(.*)$/m)?.[1];
    const supplied = Buffer.from(password);
    const configured = Buffer.from(decodePropertyValue(configuredPassword || ''));
    if (supplied.length !== configured.length || !timingSafeEqual(supplied, configured)) {
        throw rejectedCredentialsError('Wrong SU password');
    }
};

// Prints which sandbox the following indented credential prompts belong to.
export const printPromptHeading = (heading) => console.error(heading);

// Rewrites a "\r…" progress line in place. On a terminal the line is cut to the terminal width:
// a wrapped line leaves fragments on the rows above, which \r cannot reach.
export const writeProgress = (text, stream = process.stdout) => {
    if (!stream.isTTY || !text.startsWith('\r')) {
        stream.write(text);
        return;
    }
    const line = text.slice(1);
    const width = stream.columns ? stream.columns - 1 : line.length;
    stream.write(`\r${line.slice(0, width)}\x1b[K`);
};

export const promptForAuth = (label, { runCommand = spawnSync } = {}) => {
    if (!process.stdin.isTTY || !process.stderr.isTTY) {
        throw new Error(`${label} credentials require an interactive terminal`);
    }
    const result = runCommand(
        '/bin/zsh',
        [
            '-c',
            `read -r "username?  Username: "; IFS= read -r -s "password?  Password: "; printf '\\n' >&2; printf '%s:%s' "$username" "$password"`,
        ],
        { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] }
    );
    if (result.status !== 0 || !result.stdout || result.stdout.startsWith(':')) {
        throw new Error(`${label} credentials are required`);
    }
    return result.stdout;
};

const retryWarning = (message, remaining) =>
    `  ${message}. Try again (${remaining} ${remaining === 1 ? 'try' : 'tries'} left)`;

export const promptForVerifiedAuth = async ({
    label,
    prompt,
    verify,
    attempts = 3,
    warn = console.error,
}) => {
    for (let attempt = 1; ; attempt++) {
        const auth = prompt();
        try {
            await verify(auth);
            return auth;
        } catch (error) {
            if (!error?.credentialsRejected || attempt >= attempts) {
                throw new Error(`${label} authentication failed`, { cause: error });
            }
            warn(retryWarning(error.message, attempts - attempt));
        }
    }
};

// Asks twice, since a mistyped new password locks the user out of the new sandbox.
export const promptForNewPassword = (
    label,
    { prompt = promptForPassword, attempts = 3, warn = console.error } = {}
) => {
    for (let attempt = 1; ; attempt++) {
        const password = prompt(`New ${label}`);
        if (prompt(`Repeat ${label}`) === password) {
            return password;
        }
        if (attempt >= attempts) {
            throw new Error(`The ${label}s did not match`);
        }
        warn(retryWarning('The passwords do not match', attempts - attempt));
    }
};

export const promptForPassword = (label, { runCommand = spawnSync } = {}) => {
    if (!process.stdin.isTTY || !process.stderr.isTTY) {
        throw new Error(`${label} requires an interactive terminal`);
    }
    const result = runCommand(
        '/bin/zsh',
        [
            '-c',
            `IFS= read -r -s "password?  ${label}: "; printf '\\n' >&2; printf '%s' "$password"`,
        ],
        { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] }
    );
    if (result.status !== 0 || !result.stdout) {
        throw new Error(`${label} is required`);
    }
    return result.stdout;
};

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

const isOlderXpVersion = (version, other) => {
    const parts = version.split(/[.-]/).slice(0, 3).map(Number);
    const otherParts = other.split(/[.-]/).slice(0, 3).map(Number);
    const index = parts.findIndex((part, i) => part !== otherParts[i]);
    return index >= 0 && parts[index] < otherParts[index];
};

export const assertSandboxXpVersion = (sandboxPath, sandbox, xpVersion) => {
    const { version } = readSandboxXpVersion(sandboxPath);
    if (version === xpVersion) {
        return;
    }
    // XP sandboxes can be upgraded but not downgraded.
    const fix = isOlderXpVersion(version, xpVersion)
        ? `Run \`enonic sandbox upgrade ${sandbox} --version ${xpVersion}\`, or import into a new sandbox with another --target`
        : 'Import into a new sandbox with another --target';
    throw new Error(
        `Target sandbox ${sandbox} uses XP ${version}, but the source uses XP ${xpVersion}. ${fix}`
    );
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

// Exit codes follow the 128 + signal number convention, so callers can tell interrupts from failures.
const SIGNAL_EXIT_CODES = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 };

const assertCuratedBundleName = (bundle) => {
    if (!isSafeName(bundle)) {
        throw new Error('Bundle must be a safe directory name');
    }
};

const statIfPresent = (path) => {
    try {
        return lstatSync(path);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
};

export const withCuratedWorkspace = async (
    { bundle, outputDirectory = resolve('.curated'), lifecycle = process },
    run
) => {
    assertCuratedBundleName(bundle);
    mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
    const root = lstatSync(outputDirectory);
    if (!root.isDirectory() || root.isSymbolicLink()) {
        throw new Error('Curated output directory must not be a symlink');
    }
    const directory = join(outputDirectory, bundle);
    // Exclusive creation is the ownership boundary: never reuse an earlier run.
    mkdirSync(directory, { mode: 0o700 });
    const owned = lstatSync(directory);
    const cleanup = () => {
        const currentRoot = statIfPresent(outputDirectory);
        const current = statIfPresent(directory);
        if (
            currentRoot?.dev === root.dev &&
            currentRoot?.ino === root.ino &&
            current?.dev === owned.dev &&
            current?.ino === owned.ino &&
            !current.isSymbolicLink()
        ) {
            rmSync(directory, { recursive: true, force: true });
        }
        if (currentRoot?.dev === root.dev && currentRoot?.ino === root.ino) {
            try {
                // Only succeeds when empty, so concurrent runs and other files are left alone.
                rmdirSync(outputDirectory);
            } catch (error) {
                if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) {
                    throw error;
                }
            }
        }
    };
    const handlers = Object.entries(SIGNAL_EXIT_CODES).map(([signal, code]) => {
        const handler = () => lifecycle.exit(code);
        lifecycle.on(signal, handler);
        return [signal, handler];
    });
    lifecycle.on('exit', cleanup);
    try {
        return await run({ exportDirectory: join(directory, 'exports') });
    } finally {
        try {
            cleanup();
        } finally {
            lifecycle.removeListener('exit', cleanup);
            handlers.forEach(([signal, handler]) => lifecycle.removeListener(signal, handler));
        }
    }
};

// Runs main when the module is the script node was started with, and reports errors with their causes.
export const runCli = (moduleUrl, main) => {
    if (!process.argv[1] || resolve(process.argv[1]) !== fileURLToPath(moduleUrl)) {
        return;
    }
    Promise.resolve()
        .then(main)
        .catch((error) => {
            const label =
                process.stderr.isTTY && !process.env.NO_COLOR
                    ? '\x1b[1;31mError:\x1b[0m'
                    : 'Error:';
            console.error(`${label} ${error instanceof Error ? error.message : error}`);
            for (let cause = error?.cause; cause; cause = cause.cause) {
                console.error(`  Caused by: ${cause instanceof Error ? cause.message : cause}`);
            }
            process.exitCode = error?.exitCode ?? 1;
        });
};

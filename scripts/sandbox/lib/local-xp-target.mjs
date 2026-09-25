import { execFileSync } from 'node:child_process';
import console from 'node:console';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { getXpSessionCookie, parseAuth } from './xp-auth.mjs';
import { directLocalFetch } from './xp-http.mjs';

export const LOCAL_MANAGEMENT_URL = 'http://localhost:4848';
export const LOCAL_IMPORT_SERVICE_URL =
    'http://localhost:8080/_/service/no.nav.navno/curatedExportImport';

// Fail fast when the Enonic CLI is missing; only warn on an unexpected major version.
export const EXPECTED_ENONIC_CLI_MAJOR_VERSION = 4;

export const assertEnonicCliAvailable = (
    runCommand = execFileSync,
    { expectedMajorVersion = EXPECTED_ENONIC_CLI_MAJOR_VERSION, warn = console.warn } = {}
) => {
    let output;
    try {
        output = runCommand('enonic', ['--version'], { encoding: 'utf8' });
    } catch (error) {
        if (error?.code === 'ENOENT') {
            throw new Error(
                'Enonic CLI not found; install it from https://developer.enonic.com/start before running sandbox scripts',
                { cause: error }
            );
        }
        throw new Error('Could not determine the installed Enonic CLI version', { cause: error });
    }
    const version = output.match(/(\d+)\.\d+\.\d+/)?.[1];
    if (!version) {
        warn(`Could not parse Enonic CLI version from output: ${output.trim()}`);
        return;
    }
    if (Number(version) !== expectedMajorVersion) {
        warn(
            `Installed Enonic CLI is ${output.trim()}; this project expects major version ${expectedMajorVersion}.x and unexpected behavior may occur`
        );
    }
};

export const assertLocalUrl = (value, expected) => {
    if (new URL(value).href !== new URL(expected).href) {
        throw new Error(`Curated target operations require ${expected}`);
    }
};

export const assertSandboxName = (sandbox) => {
    if (!/^(?!\.{1,2}$)[a-zA-Z0-9._-]+$/.test(sandbox || '')) {
        throw new Error('A valid, explicit local target sandbox name is required');
    }
};

export const assertLocalTargetConfiguration = (
    sandboxPath,
    { requireCuratedImport = true } = {}
) => {
    const config = readFileSync(join(sandboxPath, 'home/config/no.nav.navno.cfg'), 'utf8');
    const properties = Object.fromEntries(
        config
            .split(/\r?\n/)
            .filter((line) => line.trim() && !/^\s*[#!]/.test(line))
            .map((line) => {
                const match = line.match(/^\s*([a-zA-Z0-9._-]+)\s*=\s*([^\\]*)$/);
                if (!match) {
                    throw new Error(
                        'Target NAV configuration must use explicit, single-line properties'
                    );
                }
                return [match[1], match[2].trim()];
            })
    );
    if (properties.env !== 'localhost') {
        throw new Error('Target must explicitly configure env=localhost');
    }
    if (requireCuratedImport && properties.curatedImportEnabled !== 'true') {
        throw new Error('Target must explicitly configure curatedImportEnabled=true');
    }
    if (properties.serviceSecret !== 'dummyToken' || properties.searchApiKey) {
        throw new Error('Target must use the local dummy service secret and no search API key');
    }
    const clusterConfig = readFileSync(
        join(sandboxPath, 'home/config/com.enonic.xp.cluster.cfg'),
        'utf8'
    );
    const clusterProperties = clusterConfig
        .split(/\r?\n/)
        .filter((line) => line.trim() && !/^\s*[#!]/.test(line));
    if (
        clusterProperties.length !== 1 ||
        !/^\s*cluster\.enabled\s*=\s*false\s*$/.test(clusterProperties[0])
    ) {
        throw new Error('Target clustering configuration must contain only cluster.enabled=false');
    }
};

const PROCESS_ENVIRONMENT_KEYS = new Set([
    'PATH',
    'HOME',
    'TMPDIR',
    'TMP',
    'TEMP',
    'TERM',
    'COLORTERM',
    'SHELL',
    'USER',
    'LOGNAME',
    'LANG',
    'TZ',
    'JAVA_HOME',
    'GRADLE_USER_HOME',
    'PNPM_HOME',
    'COREPACK_HOME',
    'NODE_EXTRA_CA_CERTS',
]);

// Do not pass source credentials or inherited JVM/XP overrides to a target process.
export const getLocalProcessEnvironment = (environment = process.env) =>
    Object.fromEntries(
        Object.entries(environment).filter(
            ([key]) => PROCESS_ENVIRONMENT_KEYS.has(key) || /^LC_[A-Z_]+$/.test(key)
        )
    );

export const getLocalCliEnvironment = (auth, environment = process.env) => {
    const env = getLocalProcessEnvironment(environment);
    const { username, password } = parseAuth(auth, 'Target');
    return {
        ...env,
        ENONIC_CLI_REMOTE_URL: LOCAL_MANAGEMENT_URL,
        ENONIC_CLI_REMOTE_USER: username,
        ENONIC_CLI_REMOTE_PASS: password,
        NO_PROXY: 'localhost,127.0.0.1,::1',
        no_proxy: 'localhost,127.0.0.1,::1',
    };
};

// Checking URLs alone cannot distinguish a local XP process from a tunnel to production.
export const assertLocalTargetProcess = (
    sandbox,
    { homeDirectory = homedir(), runCommand = execFileSync, requireCuratedImport = true } = {}
) => {
    assertSandboxName(sandbox);
    const state = readFileSync(join(homeDirectory, '.enonic/.enonic'), 'utf8');
    if (state.match(/^running = "([^"]+)"$/m)?.[1] !== sandbox) {
        throw new Error(`The selected target sandbox ${sandbox} must be running`);
    }
    const sandboxPath = join(homeDirectory, '.enonic/sandboxes', sandbox);
    assertLocalTargetConfiguration(sandboxPath, { requireCuratedImport });
    const expectedHome = realpathSync(join(sandboxPath, 'home'));
    if (/\s/.test(expectedHome)) {
        throw new Error(
            'Local XP home paths containing whitespace cannot be safely attested with ps'
        );
    }
    const commandOptions = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
    let listeners;
    let executable;
    let commandLine;
    try {
        listeners = [8080, 4848].map((port) => [
            ...new Set(
                runCommand('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], commandOptions)
                    .trim()
                    .split(/\s+/)
            ),
        ]);
        if (
            listeners.some((pids) => pids.length !== 1 || !/^\d+$/.test(pids[0])) ||
            listeners[0][0] !== listeners[1][0]
        ) {
            throw new Error('Target ports are not owned by one process');
        }
        const pid = listeners[0][0];
        executable = runCommand('ps', ['-p', pid, '-o', 'comm='], commandOptions).trim();
        commandLine = runCommand('ps', ['-p', pid, '-o', 'args='], commandOptions).trim();
    } catch {
        throw new Error(
            'Cannot verify the local XP process; direct Unix sandboxes with lsof and ps are required'
        );
    }
    const homeArgument = `-Dxp.home=${expectedHome}`;
    const argumentStart = commandLine.indexOf(homeArgument);
    const argumentEnd = argumentStart + homeArgument.length;
    if (
        basename(executable) !== 'java' ||
        argumentStart < 0 ||
        (commandLine.match(/(?:^|\s)-Dxp\.home=/g) || []).length !== 1 ||
        /-D[^\s]*cluster[^\s]*enabled=(?!false(?:\s|$))/.test(commandLine) ||
        (argumentStart > 0 && !/\s/.test(commandLine[argumentStart - 1])) ||
        (argumentEnd < commandLine.length && !/\s/.test(commandLine[argumentEnd]))
    ) {
        throw new Error('The target listeners do not belong to the selected local XP home');
    }
    return sandboxPath;
};

export const verifyLocalImportTarget = async ({
    sandbox,
    auth,
    serviceUrl = LOCAL_IMPORT_SERVICE_URL,
    verifyTarget = assertLocalTargetProcess,
    getSessionCookie = getXpSessionCookie,
    fetchRequest = directLocalFetch,
    requireImportMode = false,
}) => {
    assertLocalUrl(serviceUrl, LOCAL_IMPORT_SERVICE_URL);
    verifyTarget(sandbox);
    const cookie = await getSessionCookie(serviceUrl, auth);
    const response = await fetchRequest(serviceUrl, {
        headers: { Cookie: cookie },
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    if (!response.ok || result.environment !== 'localhost' || result.importEnabled !== true) {
        throw new Error('Target has not enabled the local-only curated import service');
    }
    if (requireImportMode && result.importInProgress !== true) {
        throw new Error(
            'Target must run in curated import mode with content listeners paused; rebuild and deploy the local import application before retrying'
        );
    }
    return cookie;
};

export const runLocalXpCommand = (
    args,
    { sandbox, auth, runCommand = execFileSync, verifyTarget = assertLocalTargetProcess } = {}
) => {
    verifyTarget(sandbox);
    // CLI 4 prefers cached sessions over environment credentials, so use a throwaway CLI home.
    const cliHome = mkdtempSync(join(tmpdir(), 'curated-local-cli-'));
    try {
        return runCommand('enonic', args, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            maxBuffer: 100 * 1024 * 1024,
            env: {
                ...getLocalCliEnvironment(auth),
                ENONIC_CLI_HOME_PATH: cliHome,
            },
        });
    } catch (error) {
        // Classify known failures without forwarding output that may contain credentials.
        const output = `${error?.stdout || ''}\n${error?.stderr || ''}`;
        const reason = /session is not valid|user and password are not valid|401|403/i.test(output)
            ? 'authentication rejected'
            : /Unable to connect to remote service/i.test(output)
              ? 'management API connection failed'
              : error?.code === 'ENOENT'
                ? 'enonic executable not found'
                : 'command failed';
        throw new Error(
            `Local XP ${args[0]} operation failed (${reason}); credentials and command output withheld`,
            { cause: error }
        );
    } finally {
        rmSync(cliHome, { recursive: true, force: true });
    }
};

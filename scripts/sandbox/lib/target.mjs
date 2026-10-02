import { execFileSync } from 'node:child_process';
import console from 'node:console';
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import {
    assertSandboxXpVersion,
    directLocalFetch,
    encodePropertyValue,
    getXpSessionCookie,
    parseAuth,
    readRunningSandbox,
    readSandboxXpVersion,
    setPropertiesEntry,
} from './common.mjs';

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
    // Same rule as `enonic sandbox create`, so a bad name fails before any download.
    if (typeof sandbox !== 'string' || !/^\w+$/.test(sandbox)) {
        throw new Error(
            `Invalid sandbox name '${sandbox ?? ''}'. Use letters, digits or underscore (_) only`
        );
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
    if (readRunningSandbox(homeDirectory) !== sandbox) {
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

// Enonic CLI may print progress before its final JSON result.
export const parseCliJsonOutput = (output) => {
    const resultStart = output.lastIndexOf('\n{');
    return JSON.parse(output.slice(resultStart < 0 ? 0 : resultStart + 1));
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

const CONFIG_FILES = [
    ['config/com.enonic.xp.content.cfg', 'com.enonic.xp.content.cfg'],
    ['config/localhost/no.nav.navno.cfg', 'no.nav.navno.cfg'],
    ['config/localhost/com.enonic.xp.web.vhost.cfg', 'com.enonic.xp.web.vhost.cfg'],
    ['config/com.enonic.app.contentstudio.cfg', 'com.enonic.app.contentstudio.cfg'],
];

// Apps are installed from their vendors' own repositories without checksum pinning; the import
// trusts the same sources the source environment installed them from.
const getApplicationUrl = ({ key, version }) => {
    const vendorUrlTemplates = {
        'no.item.partfinder':
            'https://repo.itemtest.no/releases/no/item/xp-part-finder/{version}/xp-part-finder-{version}.jar',
        'systems.rcd.enonic.datatoolbox':
            'https://github.com/GlennRicaud/maven/raw/main/systems/rcd/enonic/datatoolbox/{version}/datatoolbox-{version}.jar',
    };
    if (vendorUrlTemplates[key]) {
        return vendorUrlTemplates[key].replaceAll('{version}', version);
    }
    const artifactCoordinates = {
        'com.enonic.app.audit.log': ['com/enonic/app/audit-log', 'audit-log'],
        'com.enonic.app.contentstudio.plus': [
            'com/enonic/app/contentstudio.plus',
            'contentstudio.plus',
        ],
    }[key];
    const artifactPath = artifactCoordinates?.[0] ?? key.replaceAll('.', '/');
    const artifact =
        artifactCoordinates?.[1] ??
        (key === 'com.enonic.app.contentstudio' ? 'contentstudio' : key.split('.').at(-1));
    return `https://repo.enonic.com/repository/public/${artifactPath}/${version}/${artifact}-${version}.jar`;
};

// Application URLs end in /<version>/<artifact>-<version>.jar, next to the Maven version list.
const getVersionListUrl = (application) =>
    getApplicationUrl(application).replace(/\/[^/]+\/[^/]+$/, '/maven-metadata.xml');

const getMinorVersion = (version) => version?.match(/^(\d+\.\d+)\.\d+$/)?.[1] ?? null;

const comparePatchVersions = (versionA, versionB) =>
    Number(versionA.split('.')[2]) - Number(versionB.split('.')[2]);

export const findSameMinorVersion = (publishedVersions, version) => {
    const minorVersion = getMinorVersion(version);
    if (!minorVersion) {
        return null;
    }
    return (
        publishedVersions
            .filter(
                (candidate) => candidate !== version && getMinorVersion(candidate) === minorVersion
            )
            .sort(comparePatchVersions)
            .at(-1) ?? null
    );
};

const listPublishedVersions = (application, runCommand) => {
    const metadata = String(
        runCommand(
            'curl',
            [
                '--silent',
                '--show-error',
                '--fail',
                '--location',
                '--max-time',
                '30',
                getVersionListUrl(application),
            ],
            { encoding: 'utf8' }
        )
    );
    return [...metadata.matchAll(/<version>([^<]+)<\/version>/g)].map(([, version]) => version);
};

const getErrorMessage = (error) =>
    error instanceof Error ? error.message.split('\n')[0] : String(error);

const installApplicationVersion = (
    application,
    version,
    { sandbox, auth, runCommand, verifyTarget }
) => {
    const output = runLocalXpCommand(
        ['app', 'install', '--url', getApplicationUrl({ ...application, version }), '--force'],
        { sandbox, auth, runCommand, verifyTarget }
    );
    const result = parseCliJsonOutput(output);
    if (result.Failure) {
        throw new Error(result.Failure);
    }
    const installed = result.ApplicationInstalledJson?.Application;
    if (installed?.Key !== application.key || installed?.Version !== version) {
        throw new Error(`Installation did not confirm ${application.key} ${version}`);
    }
};

// Falls back to the newest other patch of the same minor version when the exact version fails.
const installSameMinorVersion = (application, context) => {
    const fallbackVersion = findSameMinorVersion(
        listPublishedVersions(application, context.runCommand),
        application.version
    );
    if (!fallbackVersion) {
        throw new Error(`No other ${getMinorVersion(application.version)}.x version was found`);
    }
    installApplicationVersion(application, fallbackVersion, context);
    return fallbackVersion;
};

export const installCuratedApplications = ({
    applications,
    auth,
    sandbox,
    runCommand = execFileSync,
    verifyTarget = assertLocalTargetProcess,
}) => {
    const context = { sandbox, auth, runCommand, verifyTarget };
    const warnings = [];
    const results = applications
        .filter(({ key }) => key !== 'no.nav.navno')
        .map((application) => {
            verifyTarget(sandbox);
            if (
                application.required === false &&
                (application.started === false || !application.version)
            ) {
                // Apps stopped in the source may be disabled on purpose; installing would start them.
                const reason = application.version ? 'stopped in the source' : 'no source version';
                console.log(`Skipping optional application ${application.key} (${reason})`);
                warnings.push(`${application.key}: not installed, ${reason}`);
                return false;
            }
            process.stdout.write(`Installing ${application.key} ${application.version}... `);
            let exactError;
            try {
                installApplicationVersion(application, application.version, context);
                console.log('done');
                return true;
            } catch (error) {
                exactError = error;
            }
            try {
                const fallbackVersion = installSameMinorVersion(application, context);
                console.log(`installed ${fallbackVersion} instead`);
                warnings.push(
                    `${application.key}: installed ${fallbackVersion}, source has ${application.version} (${getErrorMessage(exactError)})`
                );
                return true;
            } catch (fallbackError) {
                const message = `${getErrorMessage(exactError)}; fallback: ${getErrorMessage(fallbackError)}`;
                if (application.required !== false) {
                    console.log('failed');
                    throw new Error(
                        `Could not install required application ${application.key} ${application.version}: ${message}`,
                        { cause: fallbackError }
                    );
                }
                console.log('skipped');
                warnings.push(
                    `${application.key}: not installed, source has ${application.version} (${message})`
                );
                return false;
            }
        });
    console.log(`Applications installed: ${results.filter(Boolean).length}/${results.length}`);
    if (warnings.length > 0) {
        console.warn(
            `Warning: ${warnings.length} applications differ from the source:\n${warnings.map((warning) => `  - ${warning}`).join('\n')}`
        );
    }
};

export const waitForManagementApi = (runCommand = execFileSync) => {
    runCommand(
        'curl',
        [
            '--silent',
            '--output',
            '/dev/null',
            '--retry',
            '60',
            '--retry-connrefused',
            '--retry-delay',
            '1',
            'http://localhost:4848/',
        ],
        { stdio: 'inherit', env: getLocalProcessEnvironment() }
    );
};

export const setCuratedImportMode = (sandboxPath, enabled) => {
    assertLocalTargetConfiguration(sandboxPath);
    setPropertiesEntry(
        join(sandboxPath, 'home/config/no.nav.navno.cfg'),
        'curatedImportInProgress',
        enabled ? 'true' : null
    );
};

export const prepareCuratedTarget = ({
    sandbox,
    xpVersion,
    appVersion,
    contentStudioVersion,
    applications = [{ key: 'com.enonic.app.contentstudio', version: contentStudioVersion }],
    suPassword,
    repositoryRoot = resolve('.'),
    homeDirectory = homedir(),
    runCommand = execFileSync,
    verifyTarget = assertLocalTargetProcess,
}) => {
    const sandboxPath = join(homeDirectory, '.enonic/sandboxes', sandbox);
    const sandboxMetadataPath = join(sandboxPath, '.enonic');
    if (existsSync(sandboxMetadataPath)) {
        assertLocalTargetConfiguration(sandboxPath);
        assertSandboxXpVersion(sandboxPath, sandbox, xpVersion);
        return { created: false, sandboxPath };
    }

    runCommand(
        'enonic',
        [
            'sandbox',
            'create',
            sandbox,
            '--version',
            xpVersion,
            '--skip-template',
            '--force',
            '--skip-start',
        ],
        { stdio: 'inherit', env: getLocalProcessEnvironment() }
    );

    const configDirectory = join(sandboxPath, 'home/config');
    mkdirSync(configDirectory, { recursive: true });
    CONFIG_FILES.forEach(([source, target]) => {
        copyFileSync(join(repositoryRoot, source), join(configDirectory, target));
    });
    writeFileSync(join(configDirectory, 'com.enonic.xp.cluster.cfg'), 'cluster.enabled=false\n');
    writeFileSync(
        join(configDirectory, 'com.enonic.xp.app.standardidprovider.cfg'),
        'loginWithoutUser=false\n'
    );
    // The su password is the only login on a fresh sandbox, so it is kept for later imports.
    setPropertiesEntry(
        join(configDirectory, 'system.properties'),
        'xp.suPassword',
        encodePropertyValue(suPassword),
        { mode: 0o600 }
    );

    try {
        const { distro } = readSandboxXpVersion(sandboxPath);
        const javaHome = join(homeDirectory, '.enonic/distributions', distro, 'jdk');
        runCommand(
            join(repositoryRoot, 'gradlew'),
            [
                'build',
                '--quiet',
                '-PcuratedImportLocal=true',
                `-PxpVersion=${xpVersion}`,
                `-Pversion=${appVersion}`,
            ],
            {
                cwd: repositoryRoot,
                env: { ...getLocalProcessEnvironment(), JAVA_HOME: javaHome },
                stdio: 'inherit',
            }
        );

        const deployDirectory = join(sandboxPath, 'home/deploy');
        mkdirSync(deployDirectory, { recursive: true });
        rmSync(join(deployDirectory, 'README.txt'), { force: true });
        copyFileSync(
            join(repositoryRoot, 'build/libs/navno.jar'),
            join(deployDirectory, 'navno.jar')
        );
        setCuratedImportMode(sandboxPath, true);
        runCommand('enonic', ['sandbox', 'start', sandbox, '--detach', '--force'], {
            stdio: 'inherit',
            env: getLocalProcessEnvironment(),
        });
        waitForManagementApi(runCommand);
        installCuratedApplications({
            applications,
            auth: `su:${suPassword}`,
            sandbox,
            runCommand,
            verifyTarget,
        });
    } catch (error) {
        if (existsSync(join(configDirectory, 'com.enonic.xp.cluster.cfg'))) {
            setCuratedImportMode(sandboxPath, false);
        }
        throw new Error(
            `Setting up new sandbox ${sandbox} failed. Retry with --force and the same SU password, or delete it with \`enonic sandbox delete ${sandbox}\``,
            { cause: error }
        );
    }

    return { created: true, sandboxPath };
};

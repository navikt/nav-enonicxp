import { execFileSync } from 'node:child_process';
import console from 'node:console';
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { encodePropertyValue } from './xp-auth.mjs';
import {
    assertLocalTargetConfiguration,
    assertLocalTargetProcess,
    getLocalProcessEnvironment,
    parseCliJsonOutput,
    runLocalXpCommand,
} from './local-xp-target.mjs';
import {
    assertSandboxXpVersion,
    readSandboxXpVersion,
    setPropertiesEntry,
} from './sandbox-files.mjs';

const CONFIG_FILES = [
    ['config/com.enonic.xp.content.cfg', 'com.enonic.xp.content.cfg'],
    ['config/localhost/no.nav.navno.cfg', 'no.nav.navno.cfg'],
    ['config/localhost/com.enonic.xp.web.vhost.cfg', 'com.enonic.xp.web.vhost.cfg'],
    ['config/com.enonic.app.contentstudio.cfg', 'com.enonic.app.contentstudio.cfg'],
];

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
                console.log(
                    `Skipping inactive or unversioned optional application ${application.key}`
                );
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

const setSuPassword = (systemPropertiesPath, password) => {
    setPropertiesEntry(systemPropertiesPath, 'xp.suPassword', encodePropertyValue(password), {
        mode: 0o600,
    });
};

export const removeTemporarySuPassword = (sandboxPath) => {
    setPropertiesEntry(join(sandboxPath, 'home/config/system.properties'), 'xp.suPassword', null);
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
    setSuPassword(join(configDirectory, 'system.properties'), suPassword);

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
        setCuratedImportMode(sandboxPath, false);
        removeTemporarySuPassword(sandboxPath);
        throw error;
    }

    return { created: true, sandboxPath };
};

import { execFileSync } from 'node:child_process';
import console from 'node:console';
import {
    copyFileSync,
    chmodSync,
    existsSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { encodePropertyValue } from './curated-auth.mjs';
import {
    assertLocalTargetConfiguration,
    assertLocalTargetProcess,
    getLocalProcessEnvironment,
    runLocalXpCommand,
} from './curated-local-target.mjs';

const CONFIG_FILES = [
    ['config/com.enonic.xp.content.cfg', 'com.enonic.xp.content.cfg'],
    ['config/localhost/no.nav.navno.cfg', 'no.nav.navno.cfg'],
    ['config/localhost/com.enonic.xp.web.vhost.cfg', 'com.enonic.xp.web.vhost.cfg'],
    ['config/com.enonic.app.contentstudio.cfg', 'com.enonic.app.contentstudio.cfg'],
];

const readSandboxDistro = (sandboxPath) => {
    const metadata = readFileSync(join(sandboxPath, '.enonic'), 'utf8');
    const distro = metadata.match(/^distro = "([^"]+)"$/m)?.[1];
    if (!distro) {
        throw new Error(`Could not determine the XP distribution from ${sandboxPath}/.enonic`);
    }
    return distro;
};

const getDistroVersion = (distro) =>
    distro.match(/(\d+\.\d+\.\d+(?:[-.][a-zA-Z0-9]+)?)$/)?.[1] ?? null;

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

export const installCuratedApplications = ({
    applications,
    auth,
    sandbox,
    runCommand = execFileSync,
    verifyTarget = assertLocalTargetProcess,
}) => {
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
            try {
                const output = runLocalXpCommand(
                    ['app', 'install', '--url', getApplicationUrl(application), '--force'],
                    { sandbox, auth, runCommand, verifyTarget }
                );
                const resultStart = output.lastIndexOf('\n{');
                const result = JSON.parse(output.slice(resultStart < 0 ? 0 : resultStart + 1));
                if (result.Failure) {
                    throw new Error(result.Failure);
                }
                const installed = result.ApplicationInstalledJson?.Application;
                if (
                    installed?.Key !== application.key ||
                    installed?.Version !== application.version
                ) {
                    throw new Error(
                        `Installation did not confirm ${application.key} ${application.version}`
                    );
                }
                console.log('done');
                return true;
            } catch (error) {
                const message =
                    error instanceof Error ? error.message.split('\n')[0] : String(error);
                if (application.required !== false) {
                    console.log('failed');
                    throw new Error(
                        `Could not install required application ${application.key}: ${message}`,
                        { cause: error }
                    );
                }
                console.log(`skipped (${message})`);
                return false;
            }
        });
    console.log(`Applications installed: ${results.filter(Boolean).length}/${results.length}`);
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
    const properties = readFileSync(systemPropertiesPath, 'utf8');
    const withoutPassword = properties
        .split(/\r?\n/)
        .filter((line) => !/^xp\.suPassword=/.test(line))
        .join('\n')
        .replace(/\n*$/, '\n');
    writeFileSync(
        systemPropertiesPath,
        `${withoutPassword}xp.suPassword=${encodePropertyValue(password)}\n`
    );
    chmodSync(systemPropertiesPath, 0o600);
};

export const removeTemporarySuPassword = (sandboxPath) => {
    const systemPropertiesPath = join(sandboxPath, 'home/config/system.properties');
    const properties = readFileSync(systemPropertiesPath, 'utf8');
    const updatedProperties = properties
        .split(/\r?\n/)
        .filter((line) => !/^xp\.suPassword=/.test(line))
        .join('\n')
        .replace(/\n*$/, '\n');
    writeFileSync(systemPropertiesPath, updatedProperties);
};

export const setCuratedImportMode = (sandboxPath, enabled) => {
    assertLocalTargetConfiguration(sandboxPath);
    const configPath = join(sandboxPath, 'home/config/no.nav.navno.cfg');
    const config = readFileSync(configPath, 'utf8')
        .split(/\r?\n/)
        .filter((line) => !/^\s*curatedImportInProgress\s*=/.test(line))
        .join('\n')
        .replace(/\n*$/, '\n');
    writeFileSync(configPath, `${config}${enabled ? 'curatedImportInProgress=true\n' : ''}`);
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
        const installedVersion = getDistroVersion(readSandboxDistro(sandboxPath));
        if (installedVersion !== xpVersion) {
            throw new Error(
                `Target sandbox ${sandbox} uses XP ${installedVersion}; curated source uses XP ${xpVersion}`
            );
        }
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
        const distro = readSandboxDistro(sandboxPath);
        const javaHome = join(homeDirectory, '.enonic/distributions', distro, 'jdk');
        runCommand(
            join(repositoryRoot, 'gradlew'),
            [
                'build',
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

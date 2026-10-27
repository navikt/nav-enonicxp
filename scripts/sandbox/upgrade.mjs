#!/usr/bin/env node

// Brings an existing sandbox up to what this branch builds against: the XP version from
// gradle.properties, the repo's local config, the app from this branch, and at least the app
// versions the import installs. Content is kept. Safe to run again after a failure.

import { execFileSync } from 'node:child_process';
import console from 'node:console';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { deployLocalApplication } from './deploy.mjs';
import {
    compareVersions,
    getMajorVersion,
    getSandboxPath,
    printPromptHeading,
    promptForPassword,
    promptForVerifiedAuth,
    readRepositoryXpVersion,
    readRunningSandbox,
    readSandboxXpVersion,
    runCli,
    verifyStoppedTargetAuth,
} from './lib/common.mjs';
import {
    assertEnonicCliAvailable,
    assertSandboxName,
    findApplicationUpgrades,
    getLocalProcessEnvironment,
    installCuratedApplications,
    parseCliJsonOutput,
    runLocalXpCommand,
    waitForManagementApi,
    writeSandboxConfig,
} from './lib/target.mjs';

const USAGE = 'Usage: pnpm sandbox:upgrade --sandbox NAME';

export const getUpgradeOptions = (args) => {
    const options = {};

    for (let index = 0; index < args.length; index++) {
        const value = args[index + 1];
        if (args[index] === '--sandbox' && value && !value.startsWith('--')) {
            options.sandbox = args[++index];
        } else {
            throw new Error(`Invalid argument: ${args[index]}`);
        }
    }

    return options;
};

const hasSuPassword = (sandboxPath) => {
    const propertiesPath = join(sandboxPath, 'home/config/system.properties');
    return (
        existsSync(propertiesPath) &&
        /^\s*xp\.suPassword\s*[=:]\s*\S/m.test(readFileSync(propertiesPath, 'utf8'))
    );
};

const promptForSandboxAuth = (sandbox, sandboxPath) => {
    printPromptHeading(`Sandbox: ${sandbox}`);
    return promptForVerifiedAuth({
        label: 'Sandbox',
        prompt: async () => `su:${await promptForPassword('SU password')}`,
        verify: (auth) => verifyStoppedTargetAuth(sandboxPath, auth),
    });
};

const listInstalledApplications = ({ sandbox, auth, runCommand }) =>
    parseCliJsonOutput(runLocalXpCommand(['app', 'list', '--json'], { sandbox, auth, runCommand }))
        .applications;

export const upgradeSandbox = async (
    options,
    {
        homeDirectory = homedir(),
        repositoryRoot = resolve('.'),
        runCommand = execFileSync,
        assertCli = assertEnonicCliAvailable,
        getAuth = promptForSandboxAuth,
        deploy = deployLocalApplication,
        waitForApi = waitForManagementApi,
        listApplications = listInstalledApplications,
        installApplications = installCuratedApplications,
    } = {}
) => {
    const { sandbox } = options;
    if (!sandbox) {
        throw new Error(USAGE);
    }
    assertSandboxName(sandbox);
    const sandboxPath = getSandboxPath(homeDirectory, sandbox);
    if (!existsSync(join(sandboxPath, '.enonic'))) {
        throw new Error(`Sandbox ${sandbox} does not exist`);
    }
    const { version: currentVersion } = readSandboxXpVersion(sandboxPath);
    const xpVersion = readRepositoryXpVersion(repositoryRoot);
    if (getMajorVersion(currentVersion) < getMajorVersion(xpVersion)) {
        // The content of an older major version must be migrated, which the import does.
        throw new Error(
            `Sandbox ${sandbox} uses XP ${currentVersion} and cannot be upgraded to XP ${xpVersion} in place. Import its content into a new sandbox with \`pnpm sandbox:import --source ${sandbox} --target NEW_NAME\` while ${sandbox} is running`
        );
    }
    if (compareVersions(currentVersion, xpVersion) > 0) {
        throw new Error(
            `Sandbox ${sandbox} uses XP ${currentVersion}, newer than the XP ${xpVersion} this branch builds against. XP sandboxes cannot be downgraded`
        );
    }
    if (!hasSuPassword(sandboxPath)) {
        throw new Error(
            `Sandbox ${sandbox} has no SU password. Set one with \`pnpm sandbox:config --sandbox ${sandbox} --set-password\``
        );
    }
    assertCli();
    const auth = await getAuth(sandbox, sandboxPath);

    const commandOptions = { stdio: 'inherit', env: getLocalProcessEnvironment() };
    if (readRunningSandbox(homeDirectory) === sandbox) {
        console.log(`Stopping sandbox ${sandbox}`);
        runCommand('enonic', ['sandbox', 'stop', '--force'], commandOptions);
    }
    if (currentVersion === xpVersion) {
        console.log(`Sandbox ${sandbox} already uses XP ${xpVersion}`);
    } else {
        console.log(`Upgrading sandbox ${sandbox} from XP ${currentVersion} to XP ${xpVersion}`);
        runCommand(
            'enonic',
            ['sandbox', 'upgrade', sandbox, '--version', xpVersion, '--force'],
            commandOptions
        );
    }
    const configDirectory = writeSandboxConfig({ sandboxPath, repositoryRoot });
    console.log(`Wrote config to ${configDirectory}`);
    deploy([sandbox, '--skip-start'], { runCommand, homeDirectory, repositoryRoot });
    runCommand('enonic', ['sandbox', 'start', sandbox, '--detach', '--force'], commandOptions);
    waitForApi(runCommand);

    const upgrades = findApplicationUpgrades(listApplications({ sandbox, auth, runCommand }));
    if (upgrades.length === 0) {
        console.log('Applications are up to date');
    } else {
        installApplications({ applications: upgrades, auth, sandbox, runCommand });
    }
    console.log(`Sandbox ${sandbox} is running XP ${xpVersion} with the app from this branch`);
    return { previousVersion: currentVersion, xpVersion, upgrades };
};

runCli(import.meta.url, () => upgradeSandbox(getUpgradeOptions(process.argv.slice(2))));

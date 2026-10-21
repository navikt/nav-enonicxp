#!/usr/bin/env node

// Creates an empty sandbox with the repo's local config and an su password, ready for a dump load
// or a deploy. It installs no apps and imports no content; use sandbox:import for that.

import console from 'node:console';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { getSandboxPath, printPromptHeading, promptForNewPassword, runCli } from './lib/common.mjs';
import {
    assertEnonicCliAvailable,
    assertSandboxName,
    createEmptySandbox,
    writeSandboxConfig,
} from './lib/target.mjs';

const USAGE = 'Usage: pnpm sandbox:create --sandbox NAME [--version X.Y.Z]';

export const getCreateOptions = (args) => {
    const options = {};

    for (let index = 0; index < args.length; index++) {
        const value = args[index + 1];
        const hasValue = value && !value.startsWith('--');
        if (args[index] === '--sandbox' && hasValue) {
            options.sandbox = args[++index];
        } else if (args[index] === '--version' && hasValue) {
            options.version = args[++index];
        } else {
            throw new Error(`Invalid argument: ${args[index]}`);
        }
    }

    return options;
};

// gradle.properties is the single source for the XP version the branch builds against.
export const readRepositoryXpVersion = (repositoryRoot = resolve('.')) => {
    const properties = readFileSync(join(repositoryRoot, 'gradle.properties'), 'utf8');
    const version = properties.match(/^xpVersion\s*=\s*(\S+)\s*$/m)?.[1];
    if (!version) {
        throw new Error(`Could not read xpVersion from ${repositoryRoot}/gradle.properties`);
    }
    return version;
};

export const createSandbox = async (
    options,
    {
        homeDirectory = homedir(),
        repositoryRoot = resolve('.'),
        assertCli = assertEnonicCliAvailable,
        getPassword = () => {
            printPromptHeading(`Sandbox: ${options.sandbox}`);
            return promptForNewPassword('su password');
        },
        create = createEmptySandbox,
        writeConfig = writeSandboxConfig,
    } = {}
) => {
    if (!options.sandbox) {
        throw new Error(USAGE);
    }
    assertSandboxName(options.sandbox);
    const sandboxPath = getSandboxPath(homeDirectory, options.sandbox);
    if (existsSync(join(sandboxPath, '.enonic'))) {
        throw new Error(
            `Sandbox ${options.sandbox} already exists. Use pnpm sandbox:config --sandbox ${options.sandbox} to update its config`
        );
    }
    const xpVersion = options.version ?? readRepositoryXpVersion(repositoryRoot);
    if (!/^\d+\.\d+\.\d+(?:[-.][a-zA-Z0-9]+)?$/.test(xpVersion)) {
        throw new Error(`Invalid XP version '${xpVersion}'. ${USAGE}`);
    }
    assertCli();

    // Prompted before the download, so a mistyped password does not leave a half-made sandbox.
    const suPassword = await getPassword();
    create({ sandbox: options.sandbox, xpVersion });
    const configDirectory = writeConfig({ sandboxPath, repositoryRoot, suPassword });
    console.log(`Created sandbox ${options.sandbox} with XP ${xpVersion}`);
    console.log(`Wrote config to ${configDirectory}`);
    console.log(`Start it with: enonic sandbox start ${options.sandbox} --detach`);
    return { configDirectory, xpVersion };
};

runCli(import.meta.url, () => createSandbox(getCreateOptions(process.argv.slice(2))));

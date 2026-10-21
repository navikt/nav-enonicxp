#!/usr/bin/env node

// Writes the repo's local config files into an existing sandbox, without building, deploying or
// starting anything. The password is prompted for, never passed as an argument.

import console from 'node:console';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { getSandboxPath, printPromptHeading, promptForNewPassword, runCli } from './lib/common.mjs';
import { assertSandboxName, writeSandboxConfig } from './lib/target.mjs';

export const getConfigOptions = (args) => {
    const options = {};

    for (let index = 0; index < args.length; index++) {
        if (args[index] === '--set-password') {
            options.setPassword = true;
        } else if (
            args[index] === '--sandbox' &&
            args[index + 1] &&
            !args[index + 1].startsWith('--')
        ) {
            options.sandbox = args[++index];
        } else {
            throw new Error(`Invalid argument: ${args[index]}`);
        }
    }

    return options;
};

export const configureSandbox = async (
    options,
    {
        homeDirectory = homedir(),
        getPassword = () => {
            printPromptHeading(`Sandbox: ${options.sandbox}`);
            return promptForNewPassword('su password');
        },
        writeConfig = writeSandboxConfig,
    } = {}
) => {
    if (!options.sandbox) {
        throw new Error('Usage: pnpm sandbox:config --sandbox NAME [--set-password]');
    }
    assertSandboxName(options.sandbox);
    const sandboxPath = getSandboxPath(homeDirectory, options.sandbox);
    if (!existsSync(join(sandboxPath, '.enonic'))) {
        throw new Error(`Sandbox ${options.sandbox} does not exist`);
    }

    const suPassword = options.setPassword ? await getPassword() : undefined;
    const configDirectory = writeConfig({ sandboxPath, suPassword });
    console.log(`Wrote config to ${configDirectory}`);
    return { configDirectory };
};

runCli(import.meta.url, () => configureSandbox(getConfigOptions(process.argv.slice(2))));

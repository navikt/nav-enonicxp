#!/usr/bin/env node

// Enables the local import service, then delegates to Enonic CLI so sandbox
// selection, startup prompts and deploy options behave like `enonic project deploy`.

import { execFileSync } from 'node:child_process';
import console from 'node:console';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { assertEnonicCliAvailable, assertSandboxName } from './lib/local-xp-target.mjs';

const HELP_FLAGS = new Set(['--help', '-h']);

export const resolveDeploySandbox = (args, repositoryRoot = resolve('.')) => {
    const explicitSandbox = args.find((argument) => !argument.startsWith('-'));
    if (explicitSandbox) {
        assertSandboxName(explicitSandbox);
        return explicitSandbox;
    }

    const projectMetadataPath = join(repositoryRoot, '.enonic');
    if (!existsSync(projectMetadataPath)) {
        throw new Error('No sandbox was given and this project is not associated with one');
    }
    const sandbox = readFileSync(projectMetadataPath, 'utf8').match(/^sandbox = "([^"]+)"$/m)?.[1];
    assertSandboxName(sandbox);
    return sandbox;
};

export const enableCuratedImport = (sandbox, homeDirectory = homedir()) => {
    const sandboxPath = join(homeDirectory, '.enonic/sandboxes', sandbox);
    if (!existsSync(join(sandboxPath, '.enonic'))) {
        throw new Error(`Sandbox ${sandbox} does not exist; create it before deploying to it`);
    }

    const configDirectory = join(sandboxPath, 'home/config');
    const configPath = join(configDirectory, 'no.nav.navno.cfg');
    const currentConfig = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
    const configLines = currentConfig
        .split(/\r?\n/)
        .filter((line) => line && !/^\s*curatedImportEnabled\s*=/.test(line));
    const updatedConfig =
        (configLines.length > 0 ? configLines.join('\n') + '\n' : '') +
        'curatedImportEnabled=true\n';
    if (updatedConfig !== currentConfig) {
        mkdirSync(configDirectory, { recursive: true });
        writeFileSync(configPath, updatedConfig);
        console.log(`Enabled curatedImportEnabled for sandbox ${sandbox}`);
    }
};
export const deployLocalApplication = (
    args,
    {
        runCommand = execFileSync,
        environment = process.env,
        homeDirectory = homedir(),
        repositoryRoot = resolve('.'),
    } = {}
) => {
    if (!args.some((argument) => HELP_FLAGS.has(argument))) {
        const sandbox = resolveDeploySandbox(args, repositoryRoot);
        enableCuratedImport(sandbox, homeDirectory);
    }

    return runCommand('enonic', ['project', 'deploy', ...args], {
        env: {
            ...environment,
            ORG_GRADLE_PROJECT_curatedImportLocal: 'true',
        },
        stdio: 'inherit',
    });
};

const main = () => {
    assertEnonicCliAvailable();
    deployLocalApplication(process.argv.slice(2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        main();
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    }
}

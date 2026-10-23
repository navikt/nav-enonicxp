#!/usr/bin/env node

// Enables the local import service and disables clustering, then delegates to Enonic CLI so sandbox
// selection, startup prompts and deploy options behave like `enonic project deploy`.

import { execFileSync } from 'node:child_process';
import console from 'node:console';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { getSandboxPath, readRunningSandbox, runCli, setPropertiesEntry } from './lib/common.mjs';
import { assertEnonicCliAvailable, assertSandboxName } from './lib/target.mjs';

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

export const enableCuratedImport = (
    sandbox,
    homeDirectory = homedir(),
    beforeClusterConfigChange = () => {}
) => {
    const sandboxPath = getSandboxPath(homeDirectory, sandbox);
    if (!existsSync(join(sandboxPath, '.enonic'))) {
        throw new Error(`Sandbox ${sandbox} does not exist; create it before deploying to it`);
    }

    const configDirectory = join(sandboxPath, 'home/config');
    if (
        setPropertiesEntry(
            join(configDirectory, 'no.nav.navno.cfg'),
            'curatedImportEnabled',
            'true'
        )
    ) {
        console.log(`Enabled curatedImportEnabled for sandbox ${sandbox}`);
    }

    // The import refuses clustered targets. Enonic CLI creates this file with every line commented
    // out, so add the setting when nothing is active, and keep any active config so the check can report it.
    const clusterConfigPath = join(configDirectory, 'com.enonic.xp.cluster.cfg');
    const clusterConfig = existsSync(clusterConfigPath)
        ? readFileSync(clusterConfigPath, 'utf8')
        : '';
    const hasActiveClusterConfig = clusterConfig
        .split(/\r?\n/)
        .some((line) => line.trim() && !/^\s*[#!]/.test(line));
    if (!hasActiveClusterConfig) {
        beforeClusterConfigChange();
        const separator = clusterConfig && !clusterConfig.endsWith('\n') ? '\n' : '';
        writeFileSync(clusterConfigPath, `${clusterConfig}${separator}cluster.enabled=false\n`);
        console.log(`Disabled clustering for sandbox ${sandbox}`);
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
        // XP 8 unloads every app when cluster config changes at runtime, and the system apps
        // (admin, login) do not come back, so the sandbox must be stopped first.
        const stopIfRunning = () => {
            if (readRunningSandbox(homeDirectory) !== sandbox) {
                return;
            }
            console.log(`Stopping sandbox ${sandbox} before changing its cluster config`);
            runCommand('enonic', ['sandbox', 'stop', '--force'], {
                env: environment,
                stdio: 'inherit',
            });
        };
        enableCuratedImport(sandbox, homeDirectory, stopIfRunning);
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

runCli(import.meta.url, main);

#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import console from 'node:console';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import {
    assertSandboxXpVersion,
    getSandboxPath,
    getXpSessionCookie,
    LOOPBACK_HOSTS,
    parseAuth,
    printPromptHeading,
    promptForAuth,
    promptForNewPassword,
    promptForPassword,
    promptForVerifiedAuth,
    readRunningSandbox,
    runCli,
    verifyStoppedTargetAuth,
    withCuratedWorkspace,
} from './lib/common.mjs';
import {
    authorizeDeployedSource,
    createCuratedPlan,
    inferCuratedSourceFromPage,
    resolveCuratedPage,
    resolveCuratedSource,
} from './lib/source.mjs';
import { applyCuratedImport } from './lib/apply.mjs';
import { downloadProjectIcons, extractCuratedSource, uploadProjectIcons } from './lib/extract.mjs';
import {
    assertEnonicCliAvailable,
    assertLocalTargetConfiguration,
    assertLocalTargetProcess,
    assertSandboxName,
    getLocalProcessEnvironment,
    installCuratedApplications,
    isCuratedSetupIncomplete,
    LOCAL_IMPORT_SERVICE_URL,
    prepareCuratedTarget,
    setCuratedImportMode,
    verifyLocalImportTarget,
    waitForManagementApi,
} from './lib/target.mjs';

export const getImportOptions = (args, getCurrentSandbox = () => null) => {
    const options = {};
    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        if (argument === '--force' || argument === '--include-drafts') {
            options[argument.slice(2)] = true;
            continue;
        }
        // A bare URL is short for --page.
        if (/^https?:\/\//.test(argument) && !options.page) {
            options.page = argument;
            continue;
        }
        if (!['--source', '--target', '--page', '--input'].includes(argument)) {
            throw new Error(`Unsupported argument: ${argument}`);
        }
        if (!args[index + 1] || args[index + 1].startsWith('--')) {
            throw new Error(`Invalid argument: ${argument}`);
        }
        options[argument.slice(2)] = args[index + 1];
        index += 1;
    }
    options.source ||= options.page ? inferCuratedSourceFromPage(options.page) : null;
    options.target ||= options.page ? getCurrentSandbox() : null;
    if (options.page && !options.target) {
        throw new Error('No sandbox is running; start one or pass --target');
    }
    if (!options.source || !options.target) {
        throw new Error(
            'Usage: pnpm sandbox:import --source <prod|dev1|dev2|URL|sandbox> --target <sandbox> [--force] [--include-drafts], or pnpm sandbox:import <page URL> to import one page into the running sandbox. Only page imports default to the running target.'
        );
    }
    return options;
};

const startSandbox = (sandbox) => {
    const result = spawnSync('enonic', ['sandbox', 'start', sandbox, '--detach', '--force'], {
        encoding: 'utf8',
        stdio: 'inherit',
        env: getLocalProcessEnvironment(),
    });
    if (result.status !== 0) {
        throw new Error(`Could not start target sandbox ${sandbox}`);
    }
};

const stopRunningSandbox = () => {
    const result = spawnSync('enonic', ['sandbox', 'stop', '--force'], {
        encoding: 'utf8',
        stdio: 'inherit',
        env: getLocalProcessEnvironment(),
    });
    if (result.status !== 0) {
        throw new Error('Could not stop the running local sandbox');
    }
};

const getRunningSandbox = () => readRunningSandbox(homedir());

const main = async () => {
    const options = getImportOptions(process.argv.slice(2), getRunningSandbox);
    // Local checks run before any prompt or network call, so mistakes fail right away.
    assertSandboxName(options.target);
    const pageSelection = options.page ? resolveCuratedPage({ page: options.page }) : null;
    const inputPath = pageSelection
        ? undefined
        : resolve(options.input ?? 'scripts/sandbox/curated-content-urls.txt');
    if (inputPath && !existsSync(inputPath)) {
        throw new Error(`URL list not found: ${inputPath}`);
    }
    const targetPath = getSandboxPath(homedir(), options.target);
    const targetExists = existsSync(join(targetPath, '.enonic'));
    if (options.page && !targetExists) {
        throw new Error('--page requires an existing target sandbox');
    }
    if (targetExists && !options.force && !options.page) {
        throw new Error(
            `Target sandbox ${options.target} already exists; pass --force to import into it`
        );
    }
    if (targetExists) {
        assertLocalTargetConfiguration(targetPath);
    }
    assertEnonicCliAvailable();
    const source = resolveCuratedSource(options.source);
    const sourceIsLoopback = LOOPBACK_HOSTS.has(new URL(source.origin).hostname);
    if (
        (source.kind === 'local' && source.name === options.target) ||
        (sourceIsLoopback && getRunningSandbox() === options.target)
    ) {
        throw new Error('Source and target sandbox must be different');
    }
    const sourceIsDeployed = source.kind === 'deployed';
    // Only local sandbox sources take a password; deployed sources are approved in the browser.
    let sourceAuth;
    if (sourceIsDeployed) {
        try {
            sourceAuth = await authorizeDeployedSource(source);
        } catch (error) {
            throw new Error('Source authentication failed', { cause: error });
        }
    } else {
        printPromptHeading(`Source: ${source.name}`);
        sourceAuth = await promptForVerifiedAuth({
            label: 'Source',
            prompt: () => promptForAuth('Source'),
            verify: (auth) => {
                parseAuth(auth, 'Source');
                return getXpSessionCookie(source.sourceServiceUrl, auth);
            },
        });
    }
    const targetIsRunning = getRunningSandbox() === options.target;
    printPromptHeading(`Target: ${options.target}${targetExists ? '' : ' (new sandbox)'}`);
    const targetAuth = !targetExists
        ? `su:${await promptForNewPassword('SU password')}`
        : await promptForVerifiedAuth({
              label: 'Target',
              prompt: async () =>
                  targetIsRunning
                      ? promptForAuth('Target')
                      : `su:${await promptForPassword('SU password')}`,
              verify: (auth) => {
                  parseAuth(auth, 'Target');
                  // Import mode is enabled later, when the target is restarted for the import.
                  return targetIsRunning
                      ? verifyLocalImportTarget({ sandbox: options.target, auth })
                      : verifyStoppedTargetAuth(targetPath, auth);
              },
          });
    console.log('Credentials verified');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bundle = `${pageSelection ? 'curated-page' : 'curated-plan'}-${timestamp}`;
    return withCuratedWorkspace({ bundle }, async ({ exportDirectory }) => {
        console.log(`Planning curated import from ${source.name} to ${options.target}`);
        const manifest = await createCuratedPlan({
            inputPath,
            paths: typeof pageSelection === 'string' ? [pageSelection] : [],
            seeds: pageSelection && typeof pageSelection !== 'string' ? [pageSelection] : [],
            serviceUrl: source.serviceUrl,
            auth: sourceAuth,
            bundle,
            scope: options.page ? 'page' : 'full',
            includeDrafts: options['include-drafts'] === true,
        });
        console.log(
            `Planned ${manifest.entries.length} entries in ${manifest.exports.length} branch exports`
        );
        if (targetExists) {
            // Fail before downloading anything if the target cannot run the source version.
            assertSandboxXpVersion(targetPath, options.target, manifest.xpVersion);
        }
        const navApplication = manifest.applications.find(({ key }) => key === 'no.nav.navno');
        const contentStudio = manifest.applications.find(
            ({ key }) => key === 'com.enonic.app.contentstudio'
        );
        if (
            !manifest.xpVersion ||
            !navApplication?.version ||
            !navApplication.started ||
            !contentStudio?.version ||
            !contentStudio.started
        ) {
            throw new Error(
                'Manifest must contain the XP version and started, versioned NAV and Content Studio apps'
            );
        }
        const projectIcons = options.page
            ? []
            : await downloadProjectIcons({
                  sourceServiceUrl: source.sourceServiceUrl,
                  projects: manifest.projects,
                  auth: sourceAuth,
              });

        console.log(`Downloading content from ${source.name}`);
        const extraction = await extractCuratedSource({
            manifest,
            sourceServiceUrl: source.sourceServiceUrl,
            auth: sourceAuth,
            exportDirectory,
        });
        console.log(
            `Extracted ${extraction.nodeCount} nodes and ${extraction.binaryCount} binary occurrences`
        );

        // A target whose setup was interrupted may still be running; resuming it starts it again.
        if (
            source.kind === 'local' ||
            (isCuratedSetupIncomplete(targetPath) && getRunningSandbox() === options.target)
        ) {
            stopRunningSandbox();
        }
        const target = prepareCuratedTarget({
            sandbox: options.target,
            xpVersion: manifest.xpVersion,
            appVersion: navApplication.version,
            contentStudioVersion: contentStudio.version,
            applications: manifest.applications,
            suPassword: targetAuth.slice(targetAuth.indexOf(':') + 1),
        });
        // A new sandbox is started in import mode. Signals skip finally blocks, so also
        // leave import mode on exit.
        let importModeEnabled = target.created;
        const disableImportMode = () => {
            if (importModeEnabled) {
                setCuratedImportMode(target.sandboxPath, false);
            }
        };
        process.once('exit', disableImportMode);
        try {
            if (!target.created) {
                if (getRunningSandbox() === options.target) {
                    stopRunningSandbox();
                }
                setCuratedImportMode(target.sandboxPath, true);
                importModeEnabled = true;
                startSandbox(options.target);
                waitForManagementApi();
                await verifyLocalImportTarget({ sandbox: options.target, auth: targetAuth });
                if (!options.page) {
                    installCuratedApplications({
                        applications: manifest.applications,
                        auth: targetAuth,
                        sandbox: options.target,
                    });
                }
            }
            await applyCuratedImport({
                manifest,
                exportDirectory,
                sandbox: options.target,
                auth: targetAuth,
            });
            assertLocalTargetProcess(options.target);
            if (projectIcons.length > 0) {
                console.log(
                    `Uploading ${projectIcons.length} project ${projectIcons.length === 1 ? 'icon' : 'icons'}`
                );
            }
            await uploadProjectIcons({
                targetServiceUrl: LOCAL_IMPORT_SERVICE_URL,
                icons: projectIcons,
                auth: targetAuth,
            });
        } finally {
            process.removeListener('exit', disableImportMode);
            setCuratedImportMode(target.sandboxPath, false);
            importModeEnabled = false;
            if (getRunningSandbox() === options.target) {
                stopRunningSandbox();
                startSandbox(options.target);
            }
        }

        console.log(`Curated import completed in sandbox ${options.target}`);
    });
};

runCli(import.meta.url, main);

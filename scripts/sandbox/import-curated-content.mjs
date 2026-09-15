#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import console from 'node:console';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
    parseAuth,
    getXpSessionCookie,
    promptForAuth,
    promptForPassword,
    verifyStoppedTargetAuth,
} from './lib/xp-auth.mjs';
import {
    inferCuratedSourceFromPage,
    resolveCuratedPage,
    resolveCuratedSource,
} from './lib/source-selection.mjs';
import { createCuratedPlan } from './lib/plan.mjs';
import { downloadProjectIcons, uploadProjectIcons } from './lib/project-icons.mjs';
import { extractCuratedSource } from './lib/source-extractor.mjs';
import { withCuratedWorkspace } from './lib/workspace.mjs';
import {
    assertEnonicCliAvailable,
    assertLocalTargetConfiguration,
    assertLocalTargetProcess,
    assertSandboxName,
    getLocalProcessEnvironment,
    LOCAL_IMPORT_SERVICE_URL,
    verifyLocalImportTarget,
} from './lib/local-xp-target.mjs';
import {
    installCuratedApplications,
    prepareCuratedTarget,
    setCuratedImportMode,
    waitForManagementApi,
} from './lib/target.mjs';

const IMPORT_SERVICE_URL = LOCAL_IMPORT_SERVICE_URL;

export const getImportOptions = (args, getCurrentSandbox = () => null) => {
    const options = {};
    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        if (argument === '--force') {
            options[argument.slice(2)] = true;
            continue;
        }
        if (argument === '--dump-name') {
            throw new Error(
                '--dump-name is no longer an import option. Use pnpm sandbox:dump after setting up the sandbox.'
            );
        }
        if (!['--source', '--target', '--page', '--input', '--concurrency'].includes(argument)) {
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
    if (!options.source || !options.target) {
        throw new Error(
            'Usage: pnpm sandbox:import --source <prod|dev1|dev2|URL|sandbox> --target <sandbox> [--page <URL>] [--force]. Only --page defaults to the running target.'
        );
    }
    return options;
};

export const runNodeScript = (script, args, { cwd, env = process.env } = {}) => {
    const result = spawnSync(process.execPath, [resolve(script), ...args], {
        cwd,
        env,
        encoding: 'utf8',
        stdio: 'inherit',
    });
    if (result.status !== 0) {
        throw new Error(`${script} failed`);
    }
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

const getRunningSandbox = () => {
    const statePath = join(homedir(), '.enonic/.enonic');
    return existsSync(statePath)
        ? (readFileSync(statePath, 'utf8').match(/^running = "([^"]+)"$/m)?.[1] ?? null)
        : null;
};

const main = async () => {
    assertEnonicCliAvailable();
    const options = getImportOptions(process.argv.slice(2), getRunningSandbox);
    assertSandboxName(options.target);
    const source = resolveCuratedSource(options.source);
    const sourceIsLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(
        new URL(source.origin).hostname
    );
    if (
        (source.kind === 'local' && source.name === options.target) ||
        (sourceIsLoopback && getRunningSandbox() === options.target)
    ) {
        throw new Error('Source and target sandbox must be different');
    }
    const sourceAuth = promptForAuth('Source');
    const targetPath = join(homedir(), '.enonic/sandboxes', options.target);
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
    const targetIsRunning = getRunningSandbox() === options.target;
    const targetAuth = targetExists
        ? targetIsRunning
            ? promptForAuth('Target')
            : `su:${promptForPassword('Target SU password')}`
        : `su:${promptForPassword('New local SU password')}`;
    if (!targetExists && !targetAuth.startsWith('su:')) {
        throw new Error('A new target sandbox must use the built-in su user');
    }
    parseAuth(sourceAuth, 'Source');
    parseAuth(targetAuth, 'Target');
    console.log('Verifying source and target credentials');
    try {
        await getXpSessionCookie(source.sourceServiceUrl, sourceAuth);
    } catch (error) {
        throw new Error('Source authentication failed', { cause: error });
    }
    if (targetExists && targetIsRunning) {
        try {
            await verifyLocalImportTarget({
                sandbox: options.target,
                auth: targetAuth,
                requireImportMode: true,
            });
        } catch (error) {
            throw new Error('Target authentication failed', { cause: error });
        }
    } else if (targetExists) {
        verifyStoppedTargetAuth(targetPath, targetAuth);
    }
    console.log('Credentials verified');

    const defaultInputPath =
        'scripts/sandbox/curated-content-urls.txt';
    const pageSelection = options.page ? resolveCuratedPage({ page: options.page }) : null;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bundle = `${pageSelection ? 'curated-page' : 'curated-plan'}-${timestamp}`;
    return withCuratedWorkspace({ bundle }, async ({ manifestPath, exportDirectory }) => {
        console.log(`Planning curated import from ${source.name} to ${options.target}`);
        const manifest = await createCuratedPlan({
            inputPath: pageSelection ? undefined : resolve(options.input ?? defaultInputPath),
            paths: typeof pageSelection === 'string' ? [pageSelection] : [],
            seeds: pageSelection && typeof pageSelection !== 'string' ? [pageSelection] : [],
            serviceUrl: source.serviceUrl,
            auth: sourceAuth,
            bundle,
            scope: options.page ? 'page' : 'full',
        });
        writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
            mode: 0o600,
            flag: 'wx',
        });
        console.log(
            `Planned ${manifest.entries.length} entries in ${manifest.exports.length} branch exports; manifest written to ${manifestPath}`
        );
        if (manifest.excludedDependencies.length > 0) {
            console.warn(
                `Excluded broad container dependencies: ${manifest.excludedDependencies.length}`
            );
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

        console.log(`Extracting curated source into ${exportDirectory}`);
        const extraction = await extractCuratedSource({
            manifest,
            sourceServiceUrl: source.sourceServiceUrl,
            auth: sourceAuth,
            exportDirectory,
            binaryConcurrency: options.concurrency ? Number(options.concurrency) : 4,
        });
        console.log(
            `Extracted ${extraction.nodeCount} nodes and ${extraction.binaryCount} binary occurrences`
        );

        if (source.kind === 'local') {
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
        try {
            if (!target.created) {
                if (getRunningSandbox() === options.target) {
                    stopRunningSandbox();
                }
                setCuratedImportMode(target.sandboxPath, true);
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
            console.log(`Starting content import into ${options.target}`);
            runNodeScript(
                'scripts/sandbox/apply-curated-export.mjs',
                [
                    '--manifest',
                    manifestPath,
                    '--service-url',
                    IMPORT_SERVICE_URL,
                    '--sandbox',
                    options.target,
                    '--export-dir',
                    exportDirectory,
                ],
                { env: { ...getLocalProcessEnvironment(), ENONIC_AUTH: targetAuth } }
            );
            assertLocalTargetProcess(options.target);
            console.log('Uploading project icons');
            await uploadProjectIcons({
                targetServiceUrl: IMPORT_SERVICE_URL,
                icons: projectIcons,
                auth: targetAuth,
            });
        } finally {
            setCuratedImportMode(target.sandboxPath, false);
            if (getRunningSandbox() === options.target) {
                stopRunningSandbox();
                startSandbox(options.target);
            }
        }

        console.log(`Curated import completed in sandbox ${options.target}`);
    });
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}

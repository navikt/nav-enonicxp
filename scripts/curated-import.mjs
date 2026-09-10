#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import console from 'node:console';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import {
    parseAuth,
    promptForAuth,
    promptForPassword,
    verifyStoppedTargetAuth,
} from './lib/curated-auth.mjs';
import { resolveCuratedSource } from './lib/curated-environments.mjs';
import { inferCuratedSourceFromPage, resolveCuratedPage } from './lib/curated-page.mjs';
import { downloadProjectIcons, uploadProjectIcons } from './lib/curated-project-icons.mjs';
import { extractCuratedSource } from './lib/curated-source-extractor.mjs';
import { getXpSessionCookie } from './lib/xp-session.mjs';
import {
    assertLocalTargetConfiguration,
    assertLocalTargetProcess,
    assertSandboxName,
    getLocalProcessEnvironment,
    LOCAL_IMPORT_SERVICE_URL,
    verifyLocalImportTarget,
} from './lib/curated-local-target.mjs';
import {
    installCuratedApplications,
    prepareCuratedTarget,
    waitForManagementApi,
} from './lib/curated-target.mjs';

const IMPORT_SERVICE_URL = LOCAL_IMPORT_SERVICE_URL;

const getArguments = () => {
    const args = process.argv.slice(2);
    const options = {};
    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        if (argument === '--plan-only' || argument === '--force') {
            options[argument.slice(2)] = true;
            continue;
        }
        if (!argument.startsWith('--') || !args[index + 1]) {
            throw new Error(`Invalid argument: ${argument}`);
        }
        options[argument.slice(2)] = args[index + 1];
        index += 1;
    }
    return options;
};

const runNodeScript = (script, args, { cwd, env = process.env } = {}) => {
    const result = spawnSync(process.execPath, [resolve(script), ...args], {
        cwd,
        env,
        encoding: 'utf8',
        stdio: ['inherit', 'pipe', 'pipe'],
    });
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
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
    const options = getArguments();
    options.source ||= options.page ? inferCuratedSourceFromPage(options.page) : null;
    options.target ||= options.page ? getRunningSandbox() : null;
    if (!options.source || !options.target) {
        throw new Error(
            'Usage: pnpm curated:import --source <prod|dev1|dev2|URL|sandbox> --target <sandbox> [--page <URL>] [--dump-name <name>] [--plan-only] [--force]'
        );
    }
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
    const sourceAuth =
        process.env.CURATED_SOURCE_AUTH || process.env.ENONIC_AUTH || promptForAuth('Source');
    const targetPath = join(homedir(), '.enonic/sandboxes', options.target);
    const targetExists = existsSync(join(targetPath, '.enonic'));
    if (options.page && !targetExists) {
        throw new Error('--page requires an existing target sandbox');
    }
    if (targetExists && !options.force && !options.page && !options['plan-only']) {
        throw new Error(
            `Target sandbox ${options.target} already exists; pass --force to import into it`
        );
    }
    if (targetExists && !options['plan-only']) {
        assertLocalTargetConfiguration(targetPath);
    }
    const targetIsRunning = getRunningSandbox() === options.target;
    const targetAuth = options['plan-only']
        ? null
        : targetExists
          ? process.env.CURATED_TARGET_AUTH ||
            (targetIsRunning
                ? promptForAuth('Target')
                : `su:${promptForPassword('Target SU password')}`)
          : process.env.CURATED_TARGET_AUTH || `su:${promptForPassword('New local SU password')}`;
    if (!targetExists && targetAuth && !targetAuth.startsWith('su:')) {
        throw new Error('CURATED_TARGET_AUTH must use su:password for a new target sandbox');
    }
    parseAuth(sourceAuth, 'Source');
    if (targetAuth) {
        parseAuth(targetAuth, 'Target');
    }
    console.log('Verifying source and target credentials');
    try {
        await getXpSessionCookie(source.sourceServiceUrl, sourceAuth);
    } catch (error) {
        throw new Error('Source authentication failed', { cause: error });
    }
    if (targetAuth && targetExists && targetIsRunning) {
        try {
            await verifyLocalImportTarget({ sandbox: options.target, auth: targetAuth });
        } catch (error) {
            throw new Error('Target authentication failed', { cause: error });
        }
    } else if (targetAuth && targetExists) {
        verifyStoppedTargetAuth(targetPath, targetAuth);
    }
    console.log('Credentials verified');

    const outputDirectory = resolve('.curated');
    mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
    chmodSync(outputDirectory, 0o700);
    const defaultInputPath =
        'src/main/resources/services/curatedExportManifest/curated-content-urls.txt';
    const pageSelection = options.page ? resolveCuratedPage({ page: options.page }) : null;
    const structuredSeed = pageSelection && typeof pageSelection !== 'string';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const inputPath = pageSelection
        ? join(
              outputDirectory,
              `curated-page-input-${timestamp}.${structuredSeed ? 'json' : 'txt'}`
          )
        : resolve(options.input ?? defaultInputPath);
    if (pageSelection) {
        writeFileSync(
            inputPath,
            structuredSeed ? JSON.stringify([pageSelection]) : `${pageSelection}\n`,
            { mode: 0o600 }
        );
    }
    const bundle =
        options.bundle ?? `${pageSelection ? 'curated-page' : 'curated-plan'}-${timestamp}`;
    const manifestPath = join(outputDirectory, `${bundle}.manifest.json`);

    console.log(`Planning curated import from ${source.name} to ${options.target}`);
    runNodeScript(
        'scripts/create-curated-export.mjs',
        [
            structuredSeed ? '--seeds-file' : '--input',
            inputPath,
            '--service-url',
            source.serviceUrl,
            '--bundle',
            bundle,
            '--plan-only',
            ...(options.page ? ['--scope', 'page'] : []),
        ],
        {
            cwd: outputDirectory,
            env: { ...getLocalProcessEnvironment(), ENONIC_AUTH: sourceAuth },
        }
    );
    if (options['plan-only']) {
        return;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
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

    const exportDirectory = join(outputDirectory, bundle);
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
    if (!target.created) {
        if (getRunningSandbox() === options.target) {
            stopRunningSandbox();
        }
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

    try {
        runNodeScript(
            'scripts/import-curated-export.mjs',
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
        await uploadProjectIcons({
            targetServiceUrl: IMPORT_SERVICE_URL,
            icons: projectIcons,
            auth: targetAuth,
        });
        if (options['dump-name']) {
            runNodeScript(
                'scripts/create-curated-dump.mjs',
                ['--sandbox', options.target, '--name', options['dump-name']],
                { env: { ...getLocalProcessEnvironment(), ENONIC_AUTH: targetAuth } }
            );
        }
    } finally {
        if (target.created) {
            stopRunningSandbox();
            startSandbox(options.target);
        }
    }

    console.log(
        options['dump-name']
            ? `Curated import completed in sandbox ${options.target}; created dump ${options['dump-name']}`
            : `Curated import completed in sandbox ${options.target}`
    );
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});

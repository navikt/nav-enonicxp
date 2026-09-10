#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { directLocalFetch } from './lib/curated-http.mjs';
import {
    assertLocalTargetProcess,
    assertLocalUrl,
    getLocalProcessEnvironment,
    LOCAL_MANAGEMENT_URL,
    verifyLocalImportTarget,
} from './lib/curated-local-target.mjs';

const getArguments = () => {
    const args = process.argv.slice(2);
    const options = {};

    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        if (argument === '--force') {
            options.force = true;
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

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

class HttpError extends Error {
    constructor(response, result) {
        super(`${response.status} ${response.statusText}: ${JSON.stringify(result)}`);
        this.status = response.status;
    }
}

const request = async (url, auth, sandbox, options = {}) => {
    assertLocalTargetProcess(sandbox);
    const response = await directLocalFetch(url, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: {
            Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    const responseBody = await response.text();
    let result;
    try {
        result = JSON.parse(responseBody);
    } catch {
        throw new Error(`${response.status} ${response.statusText}: ${responseBody.slice(0, 200)}`);
    }
    if (!response.ok) {
        throw new HttpError(response, result);
    }

    return result;
};

const requestWithRetry = async (url, auth, sandbox) => {
    let lastError;
    for (let attempt = 0; attempt < 120; attempt += 1) {
        try {
            return await request(url, auth, sandbox);
        } catch (error) {
            if (
                !(error instanceof TypeError) &&
                !(error instanceof HttpError && (error.status >= 500 || error.status === 429))
            ) {
                throw error;
            }
            lastError = error;
            await wait(1000);
        }
    }

    throw lastError;
};

const findImportErrors = (result) =>
    result.repositories.flatMap((repository) => [
        ...(repository.versions?.errors ?? []),
        ...repository.branches.flatMap((branch) => branch.errors),
    ]);

const assertRunningSandbox = (sandbox) => {
    const cliState = readFileSync(join(homedir(), '.enonic', '.enonic'), 'utf8');
    const runningSandbox = cliState.match(/^running = "([^"]+)"$/m)?.[1];
    if (runningSandbox !== sandbox) {
        throw new Error(
            `Start ${sandbox} before loading the dump; currently running: ${runningSandbox ?? 'none'}`
        );
    }
};

const main = async () => {
    const options = getArguments();
    const auth = process.env.ENONIC_AUTH;
    if (!options.dump || !options.sandbox || !options.force || !auth) {
        throw new Error(
            "Usage: ENONIC_AUTH='user:password' node scripts/load-curated-dump.mjs --sandbox NAME --dump FILE.zip --force"
        );
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(options.sandbox)) {
        throw new Error('--sandbox contains unsupported characters');
    }
    if (extname(options.dump).toLowerCase() !== '.zip') {
        throw new Error('--dump must point to an XP system dump ZIP');
    }
    assertRunningSandbox(options.sandbox);
    const managementUrl = options['management-url'] ?? LOCAL_MANAGEMENT_URL;
    assertLocalUrl(managementUrl, LOCAL_MANAGEMENT_URL);
    await verifyLocalImportTarget({ sandbox: options.sandbox, auth });

    const dumpFileName = basename(options.dump);
    const dumpName = dumpFileName.slice(0, -extname(dumpFileName).length);
    const dumpDirectory = join(
        homedir(),
        '.enonic',
        'sandboxes',
        options.sandbox,
        'home',
        'data',
        'dump'
    );
    const targetPath = join(dumpDirectory, dumpFileName);
    mkdirSync(dumpDirectory, { recursive: true });
    if (realpathSync(options.dump) !== targetPath) {
        copyFileSync(options.dump, targetPath);
    }

    const { taskId } = await request(`${managementUrl}/system/load`, auth, options.sandbox, {
        method: 'POST',
        body: JSON.stringify({ name: dumpName, archive: true }),
    });

    let status;
    const deadline = Date.now() + 30 * 60 * 1000;
    while (!status || status.state === 'WAITING' || status.state === 'RUNNING') {
        if (Date.now() > deadline) {
            throw new Error('Dump loading exceeded 30 minutes; completion is unverified');
        }
        await wait(1000);
        try {
            status = await requestWithRetry(
                `${managementUrl}/task/${taskId}`,
                auth,
                options.sandbox
            );
        } catch (error) {
            if (error instanceof HttpError && error.status === 404) {
                throw new Error(
                    'Dump load task disappeared when system-repo was replaced. Completion and content integrity are unverified; the sandbox has not been restarted.'
                );
            }
            throw error;
        }
        process.stdout.write(
            `\rLoading ${dumpName}: ${status.progress.current}/${status.progress.total}`
        );
    }
    process.stdout.write('\n');

    if (status.state !== 'FINISHED') {
        throw new Error(`XP dump load ${status.state.toLowerCase()}: ${status.progress.info}`);
    }

    const result = JSON.parse(status.progress.info);
    const importErrors = findImportErrors(result);
    if (importErrors.length > 0) {
        throw new Error(`XP reported dump load errors: ${JSON.stringify(importErrors)}`);
    }
    const repositoryCount = result.repositories.length;

    console.log(
        `Loaded ${repositoryCount} repositories from ${dumpFileName}. Restarting ${options.sandbox}.`
    );
    assertLocalTargetProcess(options.sandbox);
    const commandOptions = { stdio: 'inherit', env: getLocalProcessEnvironment() };
    execFileSync('enonic', ['sandbox', 'stop', '--force'], commandOptions);
    execFileSync(
        'enonic',
        ['sandbox', 'start', options.sandbox, '--detach', '--force'],
        commandOptions
    );
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});

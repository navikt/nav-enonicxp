#!/usr/bin/env node

import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as wait } from 'node:timers/promises';
import { promptForAuth } from './lib/curated-auth.mjs';
import { directLocalFetch } from './lib/curated-http.mjs';
import {
    assertEnonicCliAvailable,
    assertLocalTargetProcess,
    assertSandboxName,
    LOCAL_MANAGEMENT_URL,
    verifyLocalImportTarget,
} from './lib/curated-local-target.mjs';

export const getDumpOptions = (args) => {
    const options = {};

    for (let index = 0; index < args.length; index += 2) {
        if (
            !['--sandbox', '--name'].includes(args[index]) ||
            !args[index + 1] ||
            args[index + 1].startsWith('--')
        ) {
            throw new Error(`Invalid argument: ${args[index]}`);
        }
        options[args[index].slice(2)] = args[index + 1];
    }

    return options;
};

const request = async (url, auth, sandbox, options = {}) => {
    assertLocalTargetProcess(sandbox);
    const response = await directLocalFetch(url, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: {
            Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
            'Content-Type': 'application/json',
        },
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(result)}`);
    }

    return result;
};

export const createSandboxDump = async (
    options,
    {
        getAuth = () => promptForAuth('Target'),
        verifyTarget = assertLocalTargetProcess,
        verifyImportTarget = verifyLocalImportTarget,
        requestApi = request,
        waitForNextPoll = wait,
    } = {}
) => {
    if (!options.name || !options.sandbox) {
        throw new Error('Usage: pnpm sandbox:dump --sandbox NAME --name DUMP_NAME');
    }
    assertEnonicCliAvailable();
    if (!/^[a-zA-Z0-9._]+$/.test(options.name)) {
        throw new Error('--name may only contain letters, numbers, dots, and underscores');
    }
    assertSandboxName(options.sandbox);
    verifyTarget(options.sandbox);
    const auth = getAuth();
    await verifyImportTarget({ sandbox: options.sandbox, auth });
    const { taskId } = await requestApi(
        `${LOCAL_MANAGEMENT_URL}/system/dump`,
        auth,
        options.sandbox,
        {
            method: 'POST',
            body: JSON.stringify({ name: options.name, includeVersions: false, archive: true }),
        }
    );

    let status;
    const deadline = Date.now() + 30 * 60 * 1000;
    do {
        if (Date.now() > deadline) {
            throw new Error('Dump creation exceeded 30 minutes; completion is unverified');
        }
        await waitForNextPoll(1000);
        status = await requestApi(`${LOCAL_MANAGEMENT_URL}/task/${taskId}`, auth, options.sandbox);
        process.stdout.write(
            `\rCreating ${options.name}: ${status.progress.current}/${status.progress.total}`
        );
    } while (status.state === 'WAITING' || status.state === 'RUNNING');
    process.stdout.write('\n');

    if (status.state !== 'FINISHED') {
        throw new Error(`XP dump creation ${status.state.toLowerCase()}: ${status.progress.info}`);
    }

    const result = JSON.parse(status.progress.info);
    const dumpErrors = result.repositories.flatMap((repository) => [
        ...(repository.versionsErrors ?? []),
        ...repository.branches.flatMap((branch) => branch.errors),
    ]);
    if (dumpErrors.length > 0) {
        throw new Error(`XP reported dump errors: ${JSON.stringify(dumpErrors)}`);
    }

    const dumpPath = join(
        homedir(),
        '.enonic',
        'sandboxes',
        options.sandbox,
        'home',
        'data',
        'dump',
        `${options.name}.zip`
    );
    console.log(`Created ${dumpPath} with ${result.repositories.length} repositories.`);
    return { dumpPath, repositoryCount: result.repositories.length };
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    Promise.resolve()
        .then(() => createSandboxDump(getDumpOptions(process.argv.slice(2))))
        .catch((error) => {
            console.error(error instanceof Error ? error.message : error);
            process.exitCode = 1;
        });
}

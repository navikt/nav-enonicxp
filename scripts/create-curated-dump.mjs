#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { directLocalFetch } from './lib/curated-http.mjs';
import {
    assertLocalTargetProcess,
    assertLocalUrl,
    LOCAL_MANAGEMENT_URL,
    verifyLocalImportTarget,
} from './lib/curated-local-target.mjs';

const getArguments = () => {
    const args = process.argv.slice(2);
    const options = {};

    for (let index = 0; index < args.length; index += 2) {
        if (!args[index]?.startsWith('--') || !args[index + 1]) {
            throw new Error(`Invalid argument: ${args[index]}`);
        }
        options[args[index].slice(2)] = args[index + 1];
    }

    return options;
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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

const assertRunningSandbox = (sandbox) => {
    const cliState = readFileSync(join(homedir(), '.enonic', '.enonic'), 'utf8');
    const runningSandbox = cliState.match(/^running = "([^"]+)"$/m)?.[1];
    if (runningSandbox !== sandbox) {
        throw new Error(
            `Start ${sandbox} before creating the dump; currently running: ${runningSandbox ?? 'none'}`
        );
    }
};

const main = async () => {
    const options = getArguments();
    const auth = process.env.ENONIC_AUTH;
    if (!options.name || !options.sandbox || !auth) {
        throw new Error(
            "Usage: ENONIC_AUTH='user:password' node scripts/create-curated-dump.mjs --sandbox NAME --name DUMP_NAME"
        );
    }
    if (!/^[a-zA-Z0-9._]+$/.test(options.name)) {
        throw new Error('--name may only contain letters, numbers, dots, and underscores');
    }
    assertRunningSandbox(options.sandbox);

    const managementUrl = options['management-url'] ?? LOCAL_MANAGEMENT_URL;
    assertLocalUrl(managementUrl, LOCAL_MANAGEMENT_URL);
    await verifyLocalImportTarget({ sandbox: options.sandbox, auth });
    const { taskId } = await request(`${managementUrl}/system/dump`, auth, options.sandbox, {
        method: 'POST',
        body: JSON.stringify({ name: options.name, includeVersions: false, archive: true }),
    });

    let status;
    const deadline = Date.now() + 30 * 60 * 1000;
    do {
        if (Date.now() > deadline) {
            throw new Error('Dump creation exceeded 30 minutes; completion is unverified');
        }
        await wait(1000);
        status = await request(`${managementUrl}/task/${taskId}`, auth, options.sandbox);
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
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});

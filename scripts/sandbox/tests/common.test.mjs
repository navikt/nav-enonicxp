import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
    assertSandboxXpVersion,
    directLocalFetch,
    encodePropertyValue,
    fetchXp,
    parseAuth,
    promptForAuth,
    promptForPassword,
    readRunningSandbox,
    readSandboxXpVersion,
    setPropertiesEntry,
    promptForNewPassword,
    promptForVerifiedAuth,
    writeProgress,
    verifyStoppedTargetAuth,
    withCuratedWorkspace,
} from '../lib/common.mjs';
import { getLocalProcessEnvironment, parseCliJsonOutput } from '../lib/target.mjs';

const listen = async (server, t) => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => {
        server.closeAllConnections();
        server.close();
    });
    return `http://127.0.0.1:${server.address().port}`;
};

test('rejects remote cleartext and non-local direct targets before making requests', async () => {
    assert.throws(() => fetchXp('http://remote.invalid/api'), /require HTTPS/);
    assert.throws(
        () => fetchXp('https://user:synthetic-password@remote.invalid/api'),
        (error) =>
            /must not contain credentials/.test(error.message) &&
            !error.message.includes('synthetic-password')
    );
    await assert.rejects(directLocalFetch('http://remote.invalid/api'), /HTTP loopback/);
    await assert.rejects(
        directLocalFetch('http://user:password@localhost/api'),
        /without credentials/
    );
});

test(
    'local login, JSON writes and multipart uploads bypass an inherited Node proxy',
    {
        timeout: 15000,
    },
    async (t) => {
        const targetRequests = [];
        const proxyRequests = [];
        const target = await listen(
            createServer((request, response) => {
                const chunks = [];
                request.on('data', (chunk) => chunks.push(chunk));
                request.on('end', () => {
                    targetRequests.push({
                        path: request.url,
                        host: request.headers.host,
                        contentType: request.headers['content-type'],
                        body: Buffer.concat(chunks).toString(),
                    });
                    if (request.url === '/redirect') {
                        response.writeHead(302, { Location: 'http://remote.invalid/never' }).end();
                    } else if (request.url === '/upload') {
                        response.writeHead(204).end();
                    } else {
                        response.writeHead(200, {
                            'Content-Type': 'application/json',
                            'Set-Cookie': ['XPSESSION=synthetic', 'other=synthetic'],
                        });
                        response.end(JSON.stringify({ authenticated: true }));
                    }
                });
            }),
            t
        );
        const proxyServer = createServer((request, response) => {
            proxyRequests.push(request.url);
            request.resume();
            response.writeHead(200, {
                'Content-Type': 'application/json',
                'Set-Cookie': 'proxied=true',
            });
            response.end(JSON.stringify({ authenticated: true }));
        });
        const tunnels = new Set();
        proxyServer.on('connect', (_request, socket, head) => {
            tunnels.add(socket);
            socket.on('close', () => tunnels.delete(socket));
            socket.on('error', () => socket.destroy());
            socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            const respond = (data) => {
                proxyRequests.push(data.toString().split('\r\n', 1)[0]);
                const body = JSON.stringify({ authenticated: true });
                socket.end(
                    `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nSet-Cookie: proxied=true\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`
                );
            };
            if (head.length) respond(head);
            else socket.once('data', respond);
        });
        t.after(() => tunnels.forEach((socket) => socket.destroy()));
        const proxy = await listen(proxyServer, t);
        const code = `
        import { directLocalFetch, getXpSessionCookie } from ${JSON.stringify(new URL('../lib/common.mjs', import.meta.url).href)};
        const origin = ${JSON.stringify(target.replace('127.0.0.1', 'localhost'))};
        const proxySupported = process.allowedNodeEnvironmentFlags.has('--use-env-proxy');
        if (proxySupported) await (await fetch(origin + '/proxy-control')).text();
        const cookie = await getXpSessionCookie(origin + '/source', 'synthetic:password');
        const write = await directLocalFetch(origin + '/write', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({action:'synthetic'}),
        });
        const form = new FormData();
        form.set('icon', new Blob(['synthetic-icon']), 'icon.txt');
        const upload = await directLocalFetch(origin + '/upload', {method:'POST',body:form});
        let redirectRejected = false;
        try { await directLocalFetch(origin + '/redirect'); }
        catch (error) { redirectRejected = error.message.includes('redirects'); }
        console.log(JSON.stringify({cookie, write:write.status, upload:upload.status, redirectRejected, proxySupported}));
    `;
        const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
            env: {
                ...getLocalProcessEnvironment(),
                NODE_USE_ENV_PROXY: '1',
                HTTP_PROXY: proxy,
                HTTPS_PROXY: proxy,
                ALL_PROXY: proxy,
                http_proxy: proxy,
                https_proxy: proxy,
                all_proxy: proxy,
                NO_PROXY: '',
                no_proxy: '',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        t.after(() => {
            if (child.exitCode === null) child.kill();
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => {
            stdout += chunk;
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk;
        });
        const exitCode = await new Promise((resolve, reject) => {
            child.on('error', reject);
            child.on('close', resolve);
        });
        assert.equal(exitCode, 0, stderr);
        const result = JSON.parse(stdout);
        assert.equal(result.cookie, 'XPSESSION=synthetic; other=synthetic');
        assert.equal(result.write, 200);
        assert.equal(result.upload, 204);
        assert.equal(result.redirectRejected, true);
        assert.equal(proxyRequests.length, result.proxySupported ? 1 : 0);
        assert.ok(proxyRequests.every((url) => url.includes('/proxy-control')));
        assert.deepEqual(
            targetRequests.map(({ path }) => path),
            ['/_/idprovider/system', '/write', '/upload', '/redirect']
        );
        assert.match(targetRequests[2].contentType, /^multipart\/form-data; boundary=/);
        assert.match(targetRequests[2].body, /synthetic-icon/);
        assert.ok(targetRequests.every(({ host }) => host.startsWith('localhost:')));
    }
);

test('rejects missing usernames and passwords', () => {
    assert.throws(() => parseAuth(':password', 'Source'), /user:password/);
    assert.throws(() => parseAuth('su:', 'Target'), /user:password/);
    assert.throws(() => parseAuth('su:password\nxp.other=true', 'Target'), /user:password/);
});

test('round-trips Java property escaping without changing the target password', (t) => {
    const sandboxPath = mkdtempSync(join(tmpdir(), 'curated-auth-'));
    t.after(() => rmSync(sandboxPath, { recursive: true, force: true }));
    mkdirSync(join(sandboxPath, 'home/config'), { recursive: true });
    const password = ' space\\slash:\u00e6\ud83d\ude00';
    writeFileSync(
        join(sandboxPath, 'home/config/system.properties'),
        `xp.suPassword=${encodePropertyValue(password)}\n`
    );
    assert.doesNotThrow(() => verifyStoppedTargetAuth(sandboxPath, `su:${password}`));
});

test('verifies the configured password for a stopped target sandbox', (t) => {
    const sandboxPath = mkdtempSync(join(tmpdir(), 'curated-auth-'));
    t.after(() => rmSync(sandboxPath, { recursive: true, force: true }));
    mkdirSync(join(sandboxPath, 'home/config'), { recursive: true });
    writeFileSync(
        join(sandboxPath, 'home/config/system.properties'),
        'xp.suPassword=correct-password\n'
    );

    assert.doesNotThrow(() => verifyStoppedTargetAuth(sandboxPath, 'su:correct-password'));
    assert.throws(
        () => verifyStoppedTargetAuth(sandboxPath, 'su:wrong-password'),
        (error) => error.credentialsRejected && /Wrong SU password/.test(error.message)
    );
    assert.throws(
        () => verifyStoppedTargetAuth(sandboxPath, 'editor:correct-password'),
        /built-in SU user/
    );
});

test('returns credentials collected by the interactive shell prompt', () => {
    const originalInputTty = process.stdin.isTTY;
    const originalErrorTty = process.stderr.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stderr, 'isTTY', { value: true, configurable: true });
    try {
        const auth = promptForAuth('Source', {
            runCommand: () => ({ status: 0, stdout: 'editor:secret' }),
        });
        assert.equal(auth, 'editor:secret');
    } finally {
        Object.defineProperty(process.stdin, 'isTTY', {
            value: originalInputTty,
            configurable: true,
        });
        Object.defineProperty(process.stderr, 'isTTY', {
            value: originalErrorTty,
            configurable: true,
        });
    }
});

test('requires an interactive terminal for credentials', () => {
    const originalInputTty = process.stdin.isTTY;
    const originalErrorTty = process.stderr.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    Object.defineProperty(process.stderr, 'isTTY', { value: false, configurable: true });
    try {
        assert.throws(() => promptForAuth('Source'), /interactive terminal/);
        assert.throws(() => promptForPassword('SU password'), /interactive terminal/);
    } finally {
        Object.defineProperty(process.stdin, 'isTTY', {
            value: originalInputTty,
            configurable: true,
        });
        Object.defineProperty(process.stderr, 'isTTY', {
            value: originalErrorTty,
            configurable: true,
        });
    }
});

test('returns a password collected silently by the interactive shell prompt', () => {
    const originalInputTty = process.stdin.isTTY;
    const originalErrorTty = process.stderr.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stderr, 'isTTY', { value: true, configurable: true });
    try {
        const password = promptForPassword('New SU password', {
            runCommand: () => ({ status: 0, stdout: 'secret' }),
        });
        assert.equal(password, 'secret');
    } finally {
        Object.defineProperty(process.stdin, 'isTTY', {
            value: originalInputTty,
            configurable: true,
        });
        Object.defineProperty(process.stderr, 'isTTY', {
            value: originalErrorTty,
            configurable: true,
        });
    }
});

const tempDirectory = (t) => {
    const root = mkdtempSync(join(tmpdir(), 'curated-sandbox-files-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
};

test('sets, replaces and removes a single properties entry', (t) => {
    const path = join(tempDirectory(t), 'config/no.nav.navno.cfg');

    assert.equal(setPropertiesEntry(path, 'curatedImportEnabled', 'true'), true);
    assert.equal(readFileSync(path, 'utf8'), 'curatedImportEnabled=true\n');

    writeFileSync(path, 'env=localhost\n\n curatedImportEnabled = false\nxp.other=1\n\n');
    assert.equal(setPropertiesEntry(path, 'curatedImportEnabled', 'true'), true);
    assert.equal(
        readFileSync(path, 'utf8'),
        'env=localhost\n\nxp.other=1\ncuratedImportEnabled=true\n'
    );
    assert.equal(setPropertiesEntry(path, 'curatedImportEnabled', 'true'), false);

    assert.equal(setPropertiesEntry(path, 'curatedImportEnabled', null), true);
    assert.equal(readFileSync(path, 'utf8'), 'env=localhost\n\nxp.other=1\n');
});

test('treats dots in property keys literally', (t) => {
    const path = join(tempDirectory(t), 'system.properties');
    writeFileSync(path, 'xpXsuPassword=keep\nxp.suPassword=old\n');
    setPropertiesEntry(path, 'xp.suPassword', 'new');
    assert.equal(readFileSync(path, 'utf8'), 'xpXsuPassword=keep\nxp.suPassword=new\n');
});

test('reads the running sandbox and sandbox XP version', (t) => {
    const home = tempDirectory(t);
    assert.equal(readRunningSandbox(home), null);
    mkdirSync(join(home, '.enonic/sandboxes/navno'), { recursive: true });
    writeFileSync(join(home, '.enonic/.enonic'), 'running = "navno"\n');
    writeFileSync(
        join(home, '.enonic/sandboxes/navno/.enonic'),
        'distro = "enonic-xp-mac-arm64-sdk-7.16.6"\n'
    );
    const sandboxPath = join(home, '.enonic/sandboxes/navno');

    assert.equal(readRunningSandbox(home), 'navno');
    assert.deepEqual(readSandboxXpVersion(sandboxPath), {
        distro: 'enonic-xp-mac-arm64-sdk-7.16.6',
        version: '7.16.6',
    });
    assert.doesNotThrow(() => assertSandboxXpVersion(sandboxPath, 'navno', '7.16.6'));
    assert.throws(
        () => assertSandboxXpVersion(sandboxPath, 'navno', '7.17.0'),
        /uses XP 7\.16\.6, but the source uses XP 7\.17\.0\. Run `enonic sandbox upgrade navno --version 7\.17\.0`/
    );
    assert.throws(
        () => assertSandboxXpVersion(sandboxPath, 'navno', '7.16.5'),
        (error) =>
            /uses XP 7\.16\.6, but the source uses XP 7\.16\.5\. Import into a new sandbox/.test(
                error.message
            ) && !/upgrade/.test(error.message)
    );
});

test('parses the final JSON document from Enonic CLI output', () => {
    assert.deepEqual(parseCliJsonOutput('{"a":1}'), { a: 1 });
    assert.deepEqual(parseCliJsonOutput('Loading...\n{"b":2}\n'), { b: 2 });
});

const fixture = (t) => {
    const root = resolve(`.curated-workspace-test-${randomUUID()}`);
    mkdirSync(root);
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
};

for (const fail of [false, true]) {
    test(`cleans owned partial exports on ${fail ? 'failure' : 'success'}`, async (t) => {
        const root = fixture(t);
        writeFileSync(join(root, 'unrelated'), 'keep');
        const run = withCuratedWorkspace(
            { bundle: 'run', outputDirectory: root },
            async ({ exportDirectory }) => {
                mkdirSync(exportDirectory);
                writeFileSync(join(exportDirectory, 'partial-binary'), 'data');
                if (fail) {
                    throw new Error('extraction failed');
                }
                return 'done';
            }
        );
        if (fail) {
            await assert.rejects(run, /extraction failed/);
        } else {
            assert.equal(await run, 'done');
        }
        assert.deepEqual(readdirSync(root), ['unrelated']);
        assert.equal(readFileSync(join(root, 'unrelated'), 'utf8'), 'keep');
    });
}

test('removes the output directory when no other runs or files are left in it', async (t) => {
    const root = fixture(t);
    await withCuratedWorkspace({ bundle: 'run', outputDirectory: root }, async () => {});
    assert.equal(existsSync(root), false);
});

test('rejects unsafe names, existing directories and symlinks without touching them', async (t) => {
    const root = fixture(t);
    const mustNotRun = () => assert.fail('must not start import');
    for (const bundle of ['../escape', '..', '/absolute', 'nested/run', '', 'a\\b']) {
        await assert.rejects(
            withCuratedWorkspace({ bundle, outputDirectory: root }, mustNotRun),
            /safe directory name/
        );
    }
    mkdirSync(join(root, 'existing'));
    writeFileSync(join(root, 'existing', 'keep'), 'keep');
    symlinkSync(join(root, 'existing'), join(root, 'linked'));
    for (const bundle of ['existing', 'linked']) {
        await assert.rejects(withCuratedWorkspace({ bundle, outputDirectory: root }, mustNotRun));
    }
    await assert.rejects(
        withCuratedWorkspace({ bundle: 'new', outputDirectory: join(root, 'linked') }, mustNotRun),
        /symlink/
    );
    assert.equal(readFileSync(join(root, 'existing', 'keep'), 'utf8'), 'keep');
});

test('does not remove a replacement directory or leave lifecycle listeners installed', async (t) => {
    const root = fixture(t);
    const counts = ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP'].map((event) =>
        process.listenerCount(event)
    );
    await withCuratedWorkspace({ bundle: 'run', outputDirectory: root }, async () => {
        // Keep the original inode allocated, so the replacement cannot reuse it.
        renameSync(join(root, 'run'), join(root, 'moved'));
        mkdirSync(join(root, 'run'));
        writeFileSync(join(root, 'run', 'keep'), 'keep');
    });
    assert.equal(readFileSync(join(root, 'run', 'keep'), 'utf8'), 'keep');
    assert.deepEqual(
        ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP'].map((event) => process.listenerCount(event)),
        counts
    );
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'exit']) {
    test(`cleans up on ${signal}`, (t) => {
        const root = fixture(t);
        const moduleUrl = new URL('../lib/common.mjs', import.meta.url).href;
        const result = spawnSync(
            process.execPath,
            [
                '--input-type=module',
                '-e',
                `
                import { mkdirSync } from 'node:fs';
                import { withCuratedWorkspace } from ${JSON.stringify(moduleUrl)};
                await withCuratedWorkspace(
                    { bundle: 'run', outputDirectory: ${JSON.stringify(root)} },
                    async ({ exportDirectory }) => {
                        mkdirSync(exportDirectory);
                        ${signal === 'exit' ? 'process.exit(7);' : `process.kill(process.pid, '${signal}');`}
                        await new Promise(() => setInterval(() => {}, 1000));
                    }
                );
                `,
            ],
            { encoding: 'utf8', timeout: 10000 }
        );
        assert.equal(result.error, undefined);
        assert.equal(result.status, { SIGINT: 130, SIGTERM: 143, SIGHUP: 129, exit: 7 }[signal]);
        assert.equal(existsSync(join(root, 'run')), false);
        assert.equal(existsSync(root), false);
    });
}

test('asks again for rejected credentials and stops after the last try', async () => {
    const rejected = () =>
        Object.assign(new Error('Wrong SU password'), { credentialsRejected: true });
    const warnings = [];
    const answers = ['su:first', 'su:second'];
    const auth = await promptForVerifiedAuth({
        label: 'Target',
        prompt: () => answers.shift(),
        verify: (value) => {
            if (value === 'su:first') {
                throw rejected();
            }
        },
        warn: (message) => warnings.push(message),
    });
    assert.equal(auth, 'su:second');
    assert.deepEqual(warnings, ['  Wrong SU password. Try again (2 tries left)']);

    await assert.rejects(
        promptForVerifiedAuth({
            label: 'Target',
            prompt: () => 'su:wrong',
            verify: () => {
                throw rejected();
            },
            warn: () => {},
        }),
        (error) =>
            error.message === 'Target authentication failed' && /Wrong SU/.test(error.cause.message)
    );
});

test('does not ask again when verification fails for another reason', async () => {
    let prompts = 0;
    await assert.rejects(
        promptForVerifiedAuth({
            label: 'Source',
            prompt: () => {
                prompts++;
                return 'su:password';
            },
            verify: () => {
                throw new Error('connect ECONNREFUSED');
            },
        }),
        /Source authentication failed/
    );
    assert.equal(prompts, 1);
});

test('asks for a new password twice and again when the two do not match', () => {
    const labels = [];
    const warnings = [];
    const answers = ['first', 'typo', 'second', 'second'];
    const password = promptForNewPassword('SU password', {
        prompt: (label) => {
            labels.push(label);
            return answers.shift();
        },
        warn: (message) => warnings.push(message),
    });
    assert.equal(password, 'second');
    assert.deepEqual(labels, [
        'New SU password',
        'Repeat SU password',
        'New SU password',
        'Repeat SU password',
    ]);
    assert.deepEqual(warnings, ['  The passwords do not match. Try again (2 tries left)']);

    let prompts = 0;
    assert.throws(
        () =>
            promptForNewPassword('SU password', {
                prompt: () => `answer-${prompts++}`,
                warn: () => {},
            }),
        /The SU passwords did not match/
    );
    assert.equal(prompts, 6);
});

test('cuts progress lines to the terminal width so they never wrap', () => {
    const written = [];
    const terminal = { isTTY: true, columns: 21, write: (text) => written.push(text) };
    writeProgress('\rDownloaded nodes: 17182/17182', terminal);
    writeProgress('\n', terminal);
    assert.deepEqual(written, ['\rDownloaded nodes: 17\x1b[K', '\n']);

    const piped = [];
    writeProgress('\rDownloaded nodes: 1/2', { isTTY: false, write: (text) => piped.push(text) });
    assert.deepEqual(piped, ['\rDownloaded nodes: 1/2']);
});

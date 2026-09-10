import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { directLocalFetch, fetchXp } from '../lib/curated-http.mjs';
import { getLocalProcessEnvironment } from '../lib/curated-local-target.mjs';

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
        import { getXpSessionCookie } from ${JSON.stringify(new URL('../lib/xp-session.mjs', import.meta.url).href)};
        import { directLocalFetch } from ${JSON.stringify(new URL('../lib/curated-http.mjs', import.meta.url).href)};
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

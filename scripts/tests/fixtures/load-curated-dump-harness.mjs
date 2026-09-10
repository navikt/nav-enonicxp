import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const logs = [];
let polls = 0;
let restarts = 0;
let finish;
const done = new Promise((resolve) => {
    finish = resolve;
});
const processStub = {
    argv: [
        'node',
        'load-curated-dump.mjs',
        '--sandbox',
        'target',
        '--dump',
        '/fixture/fake.zip',
        '--force',
    ],
    env: { ENONIC_AUTH: 'synthetic:synthetic' },
    stdout: { write() {} },
};
const context = createContext({
    Buffer,
    AbortSignal,
    process: processStub,
    console: {
        log: (message) => logs.push(message),
        error: (message) => {
            logs.push(message);
            queueMicrotask(finish);
        },
    },
    setTimeout: (callback) => callback(),
    fetch: async (url) => {
        let status = 200;
        let body;
        if (url.endsWith('/system/load')) {
            body = { taskId: 'lost-task' };
        } else if (url.includes('/task/')) {
            polls += 1;
            if (polls === 1) {
                body = { state: 'RUNNING', progress: { current: 0, total: 100 } };
            } else {
                status = 404;
                body = { message: 'task missing' };
            }
        } else if (url.endsWith('/repo/list')) {
            body = {
                repositories: ['default', 'navno-engelsk', 'navno-nynorsk'].map((name) => ({
                    id: `com.enonic.cms.${name}`,
                })),
            };
        } else {
            throw new Error(`Unexpected mock URL ${url}`);
        }
        return {
            ok: status === 200,
            status,
            statusText: status === 200 ? 'OK' : 'Not Found',
            text: async () => JSON.stringify(body),
        };
    },
});
const modules = {
    './lib/curated-http.mjs': { directLocalFetch: context.fetch },
    'node:child_process': {
        execFileSync: (_command, args) => {
            if (args[1] === 'start') {
                restarts += 1;
                finish();
            }
        },
    },
    'node:fs': {
        copyFileSync() {},
        mkdirSync() {},
        readFileSync: () => 'running = "target"',
        realpathSync: (value) => value,
    },
    'node:os': { homedir: () => '/fake-home' },
    'node:path': path,
    './lib/curated-local-target.mjs': {
        assertLocalTargetProcess() {},
        assertLocalUrl() {},
        getLocalProcessEnvironment: () => ({}),
        verifyLocalImportTarget: async () => {},
        LOCAL_MANAGEMENT_URL: 'http://localhost:4848',
    },
};
const module = new SourceTextModule(
    readFileSync(new URL('../../load-curated-dump.mjs', import.meta.url), 'utf8'),
    { context }
);
await module.link((specifier) => {
    const exports = modules[specifier];
    if (!exports) throw new Error(`Unexpected mock import ${specifier}`);
    return new SyntheticModule(
        Object.keys(exports),
        function () {
            Object.entries(exports).forEach(([name, value]) => this.setExport(name, value));
        },
        { context }
    );
});
await module.evaluate();
await done;
console.log(JSON.stringify({ logs, restarts, exitCode: processStub.exitCode }));

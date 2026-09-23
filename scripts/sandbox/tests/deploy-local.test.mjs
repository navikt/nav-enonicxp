import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import test from 'node:test';
import {
    deployLocalApplication,
    enableCuratedImport,
    resolveDeploySandbox,
} from '../deploy-local.mjs';

const fixture = (t) => {
    const root = mkdtempSync(join(tmpdir(), 'curated-deploy-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const repositoryRoot = join(root, 'repository');
    const homeDirectory = join(root, 'home');
    const sandboxPath = join(homeDirectory, '.enonic/sandboxes/navno');
    mkdirSync(join(sandboxPath, 'home/config'), { recursive: true });
    mkdirSync(repositoryRoot, { recursive: true });
    writeFileSync(join(repositoryRoot, '.enonic'), 'sandbox = "navno"\n');
    writeFileSync(join(sandboxPath, '.enonic'), 'distro = "enonic-xp-mac-sdk-7.16.6"\n');
    return { homeDirectory, repositoryRoot, sandboxPath };
};

test('resolves an explicit sandbox or the project-associated sandbox', (t) => {
    const { repositoryRoot } = fixture(t);
    assert.equal(resolveDeploySandbox(['navno', '--skip-start'], repositoryRoot), 'navno');
    assert.equal(resolveDeploySandbox(['--skip-start'], repositoryRoot), 'navno');
});

test('enables curated import without changing other sandbox configuration', (t) => {
    const { homeDirectory, sandboxPath } = fixture(t);
    const configPath = join(sandboxPath, 'home/config/no.nav.navno.cfg');
    writeFileSync(
        configPath,
        'env=localhost\ncuratedImportEnabled=false\nserviceSecret=dummyToken\n'
    );

    enableCuratedImport('navno', homeDirectory);

    assert.equal(
        readFileSync(configPath, 'utf8'),
        'env=localhost\nserviceSecret=dummyToken\ncuratedImportEnabled=true\n'
    );
});

test('creates the application config when the sandbox does not have one', (t) => {
    const { homeDirectory, sandboxPath } = fixture(t);
    enableCuratedImport('navno', homeDirectory);
    assert.equal(
        readFileSync(join(sandboxPath, 'home/config/no.nav.navno.cfg'), 'utf8'),
        'curatedImportEnabled=true\n'
    );
});

test('configures the sandbox then delegates arguments to Enonic project deploy', (t) => {
    const { homeDirectory, repositoryRoot, sandboxPath } = fixture(t);
    const calls = [];
    deployLocalApplication(['navno', '--skip-start'], {
        environment: { PATH: '/usr/bin', CUSTOM_VALUE: 'preserved' },
        homeDirectory,
        repositoryRoot,
        runCommand(command, args, options) {
            calls.push({ command, args, options });
        },
    });

    assert.equal(
        readFileSync(join(sandboxPath, 'home/config/no.nav.navno.cfg'), 'utf8'),
        'curatedImportEnabled=true\n'
    );
    assert.equal(calls[0].command, 'enonic');
    assert.deepEqual(calls[0].args, ['project', 'deploy', 'navno', '--skip-start']);
    assert.equal(calls[0].options.stdio, 'inherit');
    assert.equal(calls[0].options.env.CUSTOM_VALUE, 'preserved');
    assert.equal(calls[0].options.env.ORG_GRADLE_PROJECT_curatedImportLocal, 'true');
});

test('passes help directly to Enonic CLI without requiring a sandbox', () => {
    const calls = [];
    deployLocalApplication(['--help'], {
        repositoryRoot: '/missing',
        homeDirectory: '/missing',
        runCommand(command, args) {
            calls.push({ command, args });
        },
    });
    assert.deepEqual(calls[0].args, ['project', 'deploy', '--help']);
});

test('rejects a missing sandbox before running the deploy command', (t) => {
    const { homeDirectory, repositoryRoot } = fixture(t);
    let called = false;
    assert.throws(
        () =>
            deployLocalApplication(['missing'], {
                homeDirectory,
                repositoryRoot,
                runCommand() {
                    called = true;
                },
            }),
        /Sandbox missing does not exist/
    );
    assert.equal(called, false);
});

test('the deploy command loads without removed CLI modules', () => {
    const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL('../deploy-local.mjs', import.meta.url))],
        { encoding: 'utf8', env: {} }
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Enonic CLI not found/);
    assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND/);
});

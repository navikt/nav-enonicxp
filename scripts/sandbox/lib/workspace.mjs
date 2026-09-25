import { lstatSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

export const assertCuratedBundleName = (bundle) => {
    if (typeof bundle !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(bundle)) {
        throw new Error('Bundle must be a safe directory name');
    }
};

const statIfPresent = (path) => {
    try {
        return lstatSync(path);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
};

export const withCuratedWorkspace = async (
    { bundle, outputDirectory = resolve('.curated'), lifecycle = process },
    run
) => {
    assertCuratedBundleName(bundle);
    mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
    const root = lstatSync(outputDirectory);
    if (!root.isDirectory() || root.isSymbolicLink()) {
        throw new Error('Curated output directory must not be a symlink');
    }
    const directory = join(outputDirectory, bundle);
    // Exclusive creation is the ownership boundary: never reuse an earlier run.
    mkdirSync(directory, { mode: 0o700 });
    const owned = lstatSync(directory);
    const cleanup = () => {
        const currentRoot = statIfPresent(outputDirectory);
        const current = statIfPresent(directory);
        if (
            currentRoot?.dev === root.dev &&
            currentRoot?.ino === root.ino &&
            current?.dev === owned.dev &&
            current?.ino === owned.ino &&
            !current.isSymbolicLink()
        ) {
            rmSync(directory, { recursive: true, force: true });
        }
    };
    const signals = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 };
    const handlers = Object.entries(signals).map(([signal, code]) => {
        const handler = () => lifecycle.exit(code);
        lifecycle.on(signal, handler);
        return [signal, handler];
    });
    lifecycle.on('exit', cleanup);
    try {
        return await run({
            manifestPath: join(directory, 'manifest.json'),
            exportDirectory: join(directory, 'exports'),
        });
    } finally {
        try {
            cleanup();
        } finally {
            lifecycle.removeListener('exit', cleanup);
            handlers.forEach(([signal, handler]) => lifecycle.removeListener(signal, handler));
        }
    }
};

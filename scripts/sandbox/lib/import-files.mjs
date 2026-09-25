import {
    cpSync,
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    realpathSync,
    rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, sep } from 'node:path';

const listRegularFiles = (root) => {
    const files = [];
    const visit = (path) => {
        const stat = lstatSync(path);
        if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
            throw new Error(
                `Curated archives may contain only regular files and directories: ${path}`
            );
        }
        if (stat.isDirectory()) {
            readdirSync(path).forEach((name) => visit(join(path, name)));
        } else {
            files.push(relative(root, path));
        }
    };
    visit(root);
    return files;
};

export const prepareCuratedImportFiles = ({
    exportNames,
    sourceDirectory,
    targetDirectory,
    verifyTarget,
}) => {
    if (typeof verifyTarget !== 'function') {
        throw new Error('Local target verification is required before staging an import');
    }
    verifyTarget();
    if (
        !Array.isArray(exportNames) ||
        exportNames.length === 0 ||
        new Set(exportNames).size !== exportNames.length ||
        exportNames.some(
            (name) => typeof name !== 'string' || !/^(?!\.{1,2}$)[a-zA-Z0-9._-]+$/.test(name)
        )
    ) {
        throw new Error('Invalid native export names');
    }
    const sourceRoot = realpathSync(sourceDirectory);
    const filesByExport = new Map();
    exportNames.forEach((name) => {
        const path = join(sourceRoot, name);
        if (!lstatSync(path).isDirectory()) {
            throw new Error(`Native export directory is missing: ${name}`);
        }
        filesByExport.set(name, listRegularFiles(path));
    });
    mkdirSync(targetDirectory, { recursive: true });
    const targetRoot = realpathSync(targetDirectory);
    const inPlace = sourceRoot === targetRoot;
    const isDescendant = (parent, child) => {
        const path = relative(parent, child);
        return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
    };
    if (
        !inPlace &&
        (isDescendant(sourceRoot, targetRoot) || isDescendant(targetRoot, sourceRoot))
    ) {
        throw new Error('Source and target export directories must not be nested');
    }
    if (!inPlace && exportNames.some((name) => existsSync(join(targetRoot, name)))) {
        throw new Error('Target export directories already exist; use a new bundle name');
    }
    let backupRoot;
    if (inPlace) {
        backupRoot = mkdtempSync(join(tmpdir(), 'curated-import-'));
        try {
            exportNames.forEach((name) =>
                cpSync(join(sourceRoot, name), join(backupRoot, name), { recursive: true })
            );
        } catch (error) {
            rmSync(backupRoot, { recursive: true, force: true });
            throw error;
        }
    }
    const retainedRoot = backupRoot || sourceRoot;
    const staged = new Set();
    return {
        sourceDirectory: retainedRoot,
        filesByExport,
        stage: (name) => {
            verifyTarget();
            if (!exportNames.includes(name)) {
                throw new Error('Cannot stage an undeclared native export');
            }
            const targetPath = join(targetRoot, name);
            if (existsSync(targetPath)) {
                if (!inPlace && !staged.has(name)) {
                    throw new Error(`Target export directory appeared during import: ${name}`);
                }
                rmSync(targetPath, { recursive: true, force: true });
            }
            staged.add(name);
            mkdirSync(targetPath, { mode: 0o700 });
            cpSync(join(retainedRoot, name), targetPath, {
                recursive: true,
                force: false,
                errorOnExist: true,
            });
        },
        cleanup: () => {
            staged.forEach((name) =>
                rmSync(join(targetRoot, name), { recursive: true, force: true })
            );
            if (backupRoot) {
                rmSync(backupRoot, { recursive: true, force: true });
            }
        },
    };
};

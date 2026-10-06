import {
    cpSync,
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    realpathSync,
    rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, sep } from 'node:path';
import process from 'node:process';
import {
    CURATED_BRANCHES,
    CURATED_REPOSITORIES,
    directLocalFetch,
    writeProgress,
} from './common.mjs';
import {
    assertLocalTargetProcess,
    LOCAL_IMPORT_SERVICE_URL,
    parseCliJsonOutput,
    runLocalXpCommand,
    verifyLocalImportTarget,
} from './target.mjs';

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

const isValidExpectation = (expected, entry, branch) =>
    expected.contentId === entry.contentId &&
    expected.contentPath === entry.paths[branch] &&
    expected.versionId === entry.versions[branch] &&
    expected.nodeType === 'content' &&
    typeof expected.childOrder === 'string' &&
    expected.childOrder !== '' &&
    (expected.manualOrderValue === null ||
        (typeof expected.manualOrderValue === 'string' &&
            /^-?\d{1,19}$/.test(expected.manualOrderValue))) &&
    Boolean(expected.indexConfig) &&
    typeof expected.indexConfig === 'object' &&
    !Array.isArray(expected.indexConfig);

const assertExportMatchesSelection = (nativeExport, entries, branch, files) => {
    const selectedFiles = new Set(
        entries.map((entry) => `${entry.paths[branch].slice('/content/'.length)}/_/node.xml`)
    );
    const actualFiles = files.filesByExport
        .get(nativeExport.exportName)
        .filter((path) => path === '_/node.xml' || path.endsWith('/_/node.xml'));
    if (
        actualFiles.length !== selectedFiles.size ||
        actualFiles.some((path) => !selectedFiles.has(path))
    ) {
        throw new Error(
            `Native export contains missing or unselected nodes: ${nativeExport.exportName}`
        );
    }
};

export const loadCuratedExpectations = (manifest, files) => {
    const groups = [];
    for (const repository of CURATED_REPOSITORIES) {
        for (const branch of CURATED_BRANCHES) {
            const entries = manifest.entries.filter(
                (entry) => entry.repoId === repository && entry.branches.includes(branch)
            );
            const nativeExport = manifest.exports.find(
                (entry) => entry.repoId === repository && entry.sourceBranch === branch
            );
            if (Boolean(nativeExport) !== entries.length > 0) {
                throw new Error(`Manifest/export membership differs for ${repository}:${branch}`);
            }
            if (!nativeExport) {
                continue;
            }
            assertExportMatchesSelection(nativeExport, entries, branch, files);
            const expectations = entries.map((entry) => {
                const path = join(
                    files.sourceDirectory,
                    nativeExport.exportName,
                    entry.paths[branch].slice('/content/'.length),
                    '_/curated-metadata.json'
                );
                const expected = JSON.parse(readFileSync(path, 'utf8'));
                if (!isValidExpectation(expected, entry, branch)) {
                    throw new Error(
                        `Missing, stale or incomplete metadata expectation for ${entry.contentId}`
                    );
                }
                return expected;
            });
            groups.push({ repository, branch, expectations });
        }
    }
    return groups;
};

export const batchCuratedExpectations = (group, size = 50) => {
    if (!Number.isInteger(size) || size < 1 || size > 100) {
        throw new Error('Metadata batch size must be between 1 and 100');
    }
    const batches = [];
    for (let start = 0; start < group.expectations.length; start += size) {
        batches.push({ ...group, expectations: group.expectations.slice(start, start + size) });
    }
    return batches;
};

const MANUAL_ORDER_WARNING = 'Not able to import nodes by manual order, using default ordering';

const formatProductionCopyDate = (generatedAt) => {
    const date = new Date(generatedAt);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid manifest generation date: ${generatedAt}`);
    }
    return new Intl.DateTimeFormat('nb-NO', {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    }).format(date);
};

const getBaseDisplayName = (project) =>
    (project.displayName || project.id).replace(
        / \([^)]+\)(?: - (?:kopi|utvalg fra) prod .+)?$/,
        ''
    );

const getExistingProductionCopyDate = (project) =>
    (project.displayName || '').match(/ - (?:kopi|utvalg fra) prod (.+)$/)?.[1];

export const labelCuratedProjects = (projects, generatedAt) => {
    const generatedCopyDate = formatProductionCopyDate(generatedAt);
    const defaultCopyDate = getExistingProductionCopyDate(projects[0]) || generatedCopyDate;
    return projects.map((project, index) => ({
        ...project,
        displayName:
            index === 0
                ? `${getBaseDisplayName(project)} (dev) - utvalg fra prod ${defaultCopyDate}`
                : getBaseDisplayName(project),
    }));
};

export const isDeferredRelocationError = (error, deferredContentIds) => {
    const contentId = String(error).match(/Node ([^ ]+) already exists/)?.[1];
    return contentId !== undefined && deferredContentIds.includes(contentId);
};

export const getSourcePublishedEntries = (entries, repository) =>
    entries.filter(
        (entry) =>
            entry.repoId === repository &&
            entry.branches.includes('draft') &&
            entry.branches.includes('master') &&
            entry.versions.draft === entry.versions.master
    );

const postImportAction = async (sessionCookie, sandbox, body) => {
    assertLocalTargetProcess(sandbox);
    const response = await directLocalFetch(LOCAL_IMPORT_SERVICE_URL, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(120000),
        headers: {
            Cookie: sessionCookie,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(`Import service returned ${response.status}: ${JSON.stringify(result)}`);
    }
    return result;
};

const getImportPhase = (entry) => {
    const branchPhase = entry.sourceBranch === 'draft' ? 0 : 2;
    return branchPhase + (entry.repoId === 'com.enonic.cms.default' ? 0 : 1);
};

const importNativeExport = (entry, auth, sandbox, deferredRelocations = []) => {
    const output = runLocalXpCommand(
        [
            'import',
            '-t',
            entry.exportName,
            '--path',
            `${entry.repoId}:${entry.sourceBranch}:${entry.importPath}`,
            '--force',
        ],
        { auth, sandbox }
    );
    const result = parseCliJsonOutput(output);
    if (!Array.isArray(result.importErrors)) {
        throw new Error(`XP returned no import error details for ${entry.exportName}`);
    }
    const unexpectedErrors = result.importErrors.filter(
        (error) =>
            !String(error).startsWith(MANUAL_ORDER_WARNING) &&
            !isDeferredRelocationError(error, deferredRelocations)
    );
    if (unexpectedErrors.length > 0) {
        throw new Error(
            `XP reported ${unexpectedErrors.length} node import errors for ${entry.exportName}: ${unexpectedErrors.slice(0, 3).join('; ')}`
        );
    }
    const warnings = result.importErrors.length;
    console.log(
        `added ${result.addedNodes?.length ?? 0} nodes, updated ${result.updateNodes?.length ?? 0}, imported ${result.importedBinaries?.length ?? 0} binaries${warnings > 0 ? `, accepted ${warnings} expected warnings` : ''}`
    );
};

export const importCuratedBundle = async ({
    manifest,
    nativeExports,
    files,
    postAction,
    importNative,
    reportProgress = console.log,
    reportCounter = writeProgress,
}) => {
    try {
        const metadataGroups = loadCuratedExpectations(manifest, files);
        if (manifest.scope !== 'page') {
            reportProgress('Configuring target login and projects');
            await postAction({ action: 'configure-login' });
            await postAction({
                action: 'configure-projects',
                applications: manifest.applications,
                projects: labelCuratedProjects(manifest.projects, manifest.generatedAt),
            });
        }
        for (const entry of nativeExports) {
            const label = `${entry.repoId}:${entry.sourceBranch}`;
            reportCounter(`Importing ${label}; this may take several minutes... `);
            const preparation = await postAction({
                action: 'prepare-project-import',
                repository: entry.repoId,
                branch: entry.sourceBranch,
                entries: manifest.entries.filter(
                    ({ repoId, branches }) =>
                        repoId === entry.repoId && branches.includes(entry.sourceBranch)
                ),
            });
            const deferredRelocations = preparation.deferredRelocations;
            if (
                !Array.isArray(deferredRelocations) ||
                deferredRelocations.some(
                    (id) =>
                        !manifest.entries.some(
                            (selected) =>
                                selected.repoId === entry.repoId &&
                                selected.contentId === id &&
                                selected.branches.includes(entry.sourceBranch)
                        )
                )
            ) {
                throw new Error('Target returned invalid deferred relocation identities');
            }
            files.stage(entry.exportName);
            await importNative(entry, deferredRelocations);
            await postAction({
                action: 'normalize-import-paths',
                repository: entry.repoId,
                branch: entry.sourceBranch,
                entries: manifest.entries.filter(
                    ({ repoId, branches }) =>
                        repoId === entry.repoId && branches.includes(entry.sourceBranch)
                ),
            });
            if (deferredRelocations.length > 0) {
                reportProgress(
                    `Reimporting ${deferredRelocations.length} relocated nodes for ${label}`
                );
                files.stage(entry.exportName);
                await importNative(entry, []);
            }
        }

        for (const group of metadataGroups) {
            const batches = batchCuratedExpectations(group);
            for (const [index, batch] of batches.entries()) {
                reportCounter(
                    `\rRestoring source metadata for ${group.repository}:${group.branch} (${index + 1}/${batches.length})`
                );
                const result = await postAction({ action: 'restore-metadata', ...batch });
                if (result.checkedNodes !== batch.expectations.length) {
                    throw new Error(
                        `Incomplete metadata restore for ${group.repository}:${group.branch}`
                    );
                }
            }
            reportCounter('\n');
        }

        for (const repository of CURATED_REPOSITORIES) {
            const publishedEntries = getSourcePublishedEntries(manifest.entries, repository);
            if (publishedEntries.length === 0) {
                continue;
            }
            reportProgress(`Synchronizing published content for ${repository}`);
            await postAction({
                action: 'synchronize-published',
                repository,
                entries: publishedEntries,
            });
        }
    } finally {
        files.cleanup();
    }
};

export const applyCuratedImport = async ({ manifest, exportDirectory, sandbox, auth }) => {
    const sessionCookie = await verifyLocalImportTarget({ sandbox, auth, requireImportMode: true });
    const sandboxPath = assertLocalTargetProcess(sandbox);
    const nativeExports = manifest.exports
        .slice()
        .sort((left, right) => getImportPhase(left) - getImportPhase(right));
    const files = prepareCuratedImportFiles({
        exportNames: nativeExports.map(({ exportName }) => exportName),
        sourceDirectory: exportDirectory,
        targetDirectory: join(sandboxPath, 'home/data/export'),
        verifyTarget: () => assertLocalTargetProcess(sandbox),
    });
    // Signals skip finally blocks, so remove staged exports from the sandbox on exit as well.
    process.once('exit', files.cleanup);
    try {
        await importCuratedBundle({
            manifest,
            nativeExports,
            files,
            postAction: (body) =>
                postImportAction(sessionCookie, sandbox, { scope: manifest.scope, ...body }),
            importNative: (entry, deferred) => importNativeExport(entry, auth, sandbox, deferred),
        });
    } finally {
        process.removeListener('exit', files.cleanup);
    }
};

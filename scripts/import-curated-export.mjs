#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promptForAuth } from './lib/curated-auth.mjs';
import { directLocalFetch } from './lib/curated-http.mjs';
import { prepareCuratedImportFiles } from './lib/curated-import-files.mjs';
import {
    batchCuratedExpectations,
    loadCuratedExpectations,
} from './lib/curated-import-expectations.mjs';
import {
    assertLocalTargetProcess,
    runLocalXpCommand,
    verifyLocalImportTarget,
} from './lib/curated-local-target.mjs';
import { labelCuratedProjects } from './lib/curated-projects.mjs';

const CONTENT_ROOT_PATH = '/content/www.nav.no';
const REQUIRED_REPO_IDS = [
    'com.enonic.cms.default',
    'com.enonic.cms.navno-engelsk',
    'com.enonic.cms.navno-nynorsk',
];
const REQUIRED_BRANCHES = ['draft', 'master'];
const MANUAL_ORDER_WARNING = 'Not able to import nodes by manual order, using default ordering';

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

const isContentPath = (path) =>
    typeof path === 'string' &&
    (path === CONTENT_ROOT_PATH || path.startsWith(`${CONTENT_ROOT_PATH}/`)) &&
    !/[%\\\u0000-\u001f\u007f]/.test(path) &&
    path
        .slice(1)
        .split('/')
        .every((segment) => segment && segment !== '.' && segment !== '..');

const isPinnedEntry = (entry) =>
    entry &&
    typeof entry === 'object' &&
    REQUIRED_REPO_IDS.includes(entry.repoId) &&
    typeof entry.contentId === 'string' &&
    /^[a-zA-Z0-9-]{1,100}$/.test(entry.contentId) &&
    Array.isArray(entry.branches) &&
    entry.branches.length > 0 &&
    new Set(entry.branches).size === entry.branches.length &&
    entry.branches.every(
        (branch) =>
            REQUIRED_BRANCHES.includes(branch) &&
            isContentPath(entry.paths?.[branch]) &&
            typeof entry.versions?.[branch] === 'string' &&
            /^[a-zA-Z0-9-]{1,100}$/.test(entry.versions[branch])
    );

const assertUniqueTargets = (entries) => {
    const identities = new Set();
    const paths = new Set();
    entries.forEach((entry) => {
        const identity = `${entry.repoId}:${entry.contentId}`;
        if (identities.has(identity)) {
            throw new Error('Manifest contains duplicate target identities or paths');
        }
        identities.add(identity);
        entry.branches.forEach((branch) => {
            const prefix = `${entry.repoId}:${branch}:`;
            if (paths.has(prefix + entry.paths[branch])) {
                throw new Error('Manifest contains duplicate target identities or paths');
            }
            paths.add(prefix + entry.paths[branch]);
        });
    });
};

const getArguments = () => {
    const args = process.argv.slice(2);
    const options = {};

    for (let index = 0; index < args.length; index += 2) {
        const argument = args[index];
        const value = args[index + 1];
        if (!argument?.startsWith('--') || !value) {
            throw new Error(`Invalid argument: ${argument || ''}`);
        }
        options[argument.slice(2)] = value;
    }

    return options;
};

const postImportAction = async (serviceUrl, sessionCookie, sandbox, body) => {
    assertLocalTargetProcess(sandbox);
    const response = await directLocalFetch(serviceUrl, {
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

const validateNativeExports = (nativeExports, scope) => {
    if ((scope !== 'full' && scope !== 'page') || !Array.isArray(nativeExports)) {
        throw new Error('Manifest must specify full or page scope and native exports');
    }
    const actualKeys = nativeExports
        .map(({ repoId, sourceBranch }) => `${repoId}:${sourceBranch}`)
        .sort();
    const expectedKeys = REQUIRED_REPO_IDS.flatMap((repoId) =>
        REQUIRED_BRANCHES.map((branch) => `${repoId}:${branch}`)
    ).sort();
    if (scope === 'full' && JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
        throw new Error(
            `Manifest must contain six repository branch exports: ${expectedKeys.join(', ')}`
        );
    }
    if (
        scope === 'page' &&
        (actualKeys.length === 0 ||
            new Set(actualKeys).size !== actualKeys.length ||
            actualKeys.some((key) => !expectedKeys.includes(key)))
    ) {
        throw new Error('Page manifest contains an invalid repository branch export');
    }
    if (
        nativeExports.some(
            ({ contentPath, importPath, exportName }) =>
                contentPath !== CONTENT_ROOT_PATH ||
                importPath !== '/content' ||
                typeof exportName !== 'string' ||
                !/^(?!\.{1,2}$)[a-zA-Z0-9._-]+$/.test(exportName)
        )
    ) {
        throw new Error(
            `Every native export must use a safe export name and root path ${CONTENT_ROOT_PATH}`
        );
    }
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
    const summaries = output
        .split(/[\r\n]+/)
        .filter((line) =>
            /^Added \d+ nodes, updated \d+ nodes, imported \d+ binaries with \d+ errors/.test(line)
        );
    const summary = summaries[summaries.length - 1];
    if (summary) {
        console.log(summary);
    }
    const resultStart = output.lastIndexOf('\n{');
    const result = JSON.parse(output.slice(resultStart < 0 ? 0 : resultStart + 1));
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
    if (result.importErrors.length > 0) {
        console.log(`Accepted ${result.importErrors.length} expected import warnings`);
    }
};

export const importCuratedBundle = async ({
    manifest,
    nativeExports,
    startIndex = 1,
    files,
    postAction,
    importNative,
    reportProgress = console.log,
}) => {
    try {
        reportProgress('Loading and checking source fidelity metadata');
        const fidelityGroups = loadCuratedExpectations(manifest, files);
        if (manifest.scope !== 'page') {
            reportProgress('Configuring target login and projects');
            await postAction({ action: 'configure-login' });
            await postAction({
                action: 'configure-projects',
                applications: manifest.applications,
                projects: labelCuratedProjects(manifest.projects, manifest.generatedAt),
            });
        }
        for (const entry of nativeExports.slice(startIndex - 1)) {
            const label = `${entry.repoId}:${entry.sourceBranch}`;
            reportProgress(`Preparing content import for ${label}`);
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
            reportProgress(`Staging export files for ${label}`);
            files.stage(entry.exportName);
            reportProgress(
                `Importing nodes and binaries for ${label}; this may take several minutes`
            );
            await importNative(entry, deferredRelocations);
            reportProgress(`Normalizing imported paths for ${label}`);
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

        for (const action of ['repair-metadata', 'validate-fidelity']) {
            const phase =
                action === 'repair-metadata'
                    ? 'Restoring source metadata'
                    : 'Validating imported content fidelity';
            for (const group of fidelityGroups) {
                const batches = batchCuratedExpectations(group);
                for (const [index, batch] of batches.entries()) {
                    reportProgress(
                        `${phase} for ${group.repository}:${group.branch} (batch ${index + 1}/${batches.length})`
                    );
                    const result = await postAction({ action, ...batch });
                    const binaryCount = batch.expectations.reduce(
                        (total, expected) => total + expected.binaries.length,
                        0
                    );
                    if (
                        result.checkedNodes !== batch.expectations.length ||
                        result.checkedBinaries !== binaryCount ||
                        result.checkedAbsentEntries !== batch.absentContentIds.length
                    ) {
                        throw new Error(
                            `Incomplete target fidelity result for ${group.repository}:${group.branch}`
                        );
                    }
                }
            }
        }

        for (const repository of REQUIRED_REPO_IDS) {
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

        console.log(
            `Imported ${nativeExports.length - startIndex + 1} repository branch exports from ${manifest.bundle}`
        );
    } finally {
        files.cleanup();
    }
};

const main = async () => {
    const options = getArguments();
    options.sandbox ||= process.env.CURATED_TARGET_SANDBOX;
    if (!options.manifest || !options['service-url'] || !options.sandbox) {
        throw new Error(
            'Usage: node scripts/import-curated-export.mjs --manifest <manifest.json> --sandbox <local target> --service-url <curatedExportImport URL> [--export-dir <unpacked directory>]'
        );
    }
    const manifest = JSON.parse(readFileSync(options.manifest, 'utf8'));
    validateNativeExports(manifest.exports, manifest.scope ?? 'full');
    if (
        manifest.formatVersion !== 1 ||
        !Array.isArray(manifest.entries) ||
        manifest.entries.length === 0 ||
        !manifest.entries.every(isPinnedEntry)
    ) {
        throw new Error(
            'A version-pinned typed export manifest is required; regenerate legacy archives'
        );
    }
    assertUniqueTargets(manifest.entries);
    const nativeExports = manifest.exports
        .slice()
        .sort(
            (left, right) =>
                getImportPhase(left) - getImportPhase(right) ||
                left.contentPath.split('/').length - right.contentPath.split('/').length ||
                left.contentPath.localeCompare(right.contentPath)
        );
    const startIndex = options['start-index'] ? Number(options['start-index']) : 1;
    if (!Number.isInteger(startIndex) || startIndex < 1 || startIndex > nativeExports.length) {
        throw new Error(`--start-index must be between 1 and ${nativeExports.length}`);
    }
    const auth = process.env.ENONIC_AUTH || promptForAuth('Target');
    console.log('Verifying the local import service');
    const sessionCookie = await verifyLocalImportTarget({
        sandbox: options.sandbox,
        serviceUrl: options['service-url'],
        auth,
        requireImportMode: true,
    });
    const sandboxPath = assertLocalTargetProcess(options.sandbox);
    console.log('Preparing local export files');
    const files = prepareCuratedImportFiles({
        exportNames: nativeExports.map(({ exportName }) => exportName),
        sourceDirectory: resolve(options['export-dir'] ?? dirname(options.manifest)),
        targetDirectory: join(sandboxPath, 'home/data/export'),
        verifyTarget: () => assertLocalTargetProcess(options.sandbox),
    });
    await importCuratedBundle({
        manifest,
        nativeExports,
        startIndex,
        files,
        postAction: (body) =>
            postImportAction(options['service-url'], sessionCookie, options.sandbox, {
                scope: manifest.scope ?? 'full',
                ...body,
            }),
        importNative: (entry, deferred) =>
            importNativeExport(entry, auth, options.sandbox, deferred),
    });
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}

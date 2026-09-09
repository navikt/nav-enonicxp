#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promptForAuth } from './lib/curated-auth.mjs';
import { isDeferredRelocationError } from './lib/curated-import-errors.mjs';
import { labelCuratedProjects } from './lib/curated-projects.mjs';

const CONTENT_ROOT_PATH = '/content/www.nav.no';
const REQUIRED_REPO_IDS = [
    'com.enonic.cms.default',
    'com.enonic.cms.navno-engelsk',
    'com.enonic.cms.navno-nynorsk',
];
const REQUIRED_BRANCHES = ['draft', 'master'];
const MANUAL_ORDER_WARNING = 'Not able to import nodes by manual order, using default ordering';

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

const getSessionCookie = async (serviceUrl, auth) => {
    const separatorIndex = auth.indexOf(':');
    if (separatorIndex < 1) {
        throw new Error('ENONIC_AUTH must use the format user:password');
    }

    const response = await fetch(new URL('/_/idprovider/system', serviceUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'login',
            user: auth.slice(0, separatorIndex),
            password: auth.slice(separatorIndex + 1),
        }),
    });
    const result = await response.json();
    if (!response.ok || !result.authenticated) {
        throw new Error('Authentication with the XP system provider failed');
    }

    return response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';', 1)[0])
        .join('; ');
};

const postImportAction = async (serviceUrl, sessionCookie, body) => {
    const response = await fetch(serviceUrl, {
        method: 'POST',
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
    const actualKeys = nativeExports
        .map(({ repoId, sourceBranch }) => `${repoId}:${sourceBranch}`)
        .sort();
    const expectedKeys = REQUIRED_REPO_IDS.flatMap((repoId) =>
        REQUIRED_BRANCHES.map((branch) => `${repoId}:${branch}`)
    ).sort();
    if (scope === 'full' && JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
        throw new Error(`Manifest must contain six repository branch exports: ${expectedKeys.join(', ')}`);
    }
    if (
        scope === 'page' &&
        (actualKeys.length === 0 || actualKeys.some((key) => !expectedKeys.includes(key)))
    ) {
        throw new Error('Page manifest contains an invalid repository branch export');
    }
    if (
        nativeExports.some(
            ({ contentPath, importPath }) =>
                contentPath !== CONTENT_ROOT_PATH || importPath !== '/content'
        )
    ) {
        throw new Error(`Every native export must use the root path ${CONTENT_ROOT_PATH}`);
    }
};

const importNativeExport = (entry, auth, cliArguments, deferredRelocations = []) => {
    const output = execFileSync(
        'enonic',
        [
            'import',
            '-t',
            entry.exportName,
            '--path',
            `${entry.repoId}:${entry.sourceBranch}:${entry.importPath}`,
            '--force',
            '--auth',
            auth,
            ...cliArguments,
        ],
        { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 }
    );
    const summaries = output
        .split(/[\r\n]+/)
        .filter((line) => /^Added \d+ nodes, updated \d+ nodes, imported \d+ binaries with \d+ errors/.test(line));
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

const main = async () => {
    const options = getArguments();
    if (!options.manifest || !options['service-url']) {
        throw new Error(
            'Usage: node scripts/import-curated-export.mjs --manifest <manifest.json> --service-url <curatedExportImport URL>'
        );
    }

    const auth = process.env.ENONIC_AUTH || promptForAuth('Target');

    const manifest = JSON.parse(readFileSync(options.manifest, 'utf8'));
    validateNativeExports(manifest.exports, manifest.scope ?? 'full');
    const sessionCookie = await getSessionCookie(options['service-url'], auth);
    if (manifest.scope !== 'page') {
        await postImportAction(options['service-url'], sessionCookie, {
            action: 'configure-login',
        });
        await postImportAction(options['service-url'], sessionCookie, {
            action: 'configure-projects',
            applications: manifest.applications,
            projects: labelCuratedProjects(manifest.projects, manifest.generatedAt),
        });
    }

    const nativeExports = manifest.exports.slice().sort((left, right) => {
        return (
            getImportPhase(left) - getImportPhase(right) ||
            left.contentPath.split('/').length - right.contentPath.split('/').length ||
            left.contentPath.localeCompare(right.contentPath)
        );
    });
    const startIndex = options['start-index'] ? Number(options['start-index']) : 1;
    if (!Number.isInteger(startIndex) || startIndex < 1 || startIndex > nativeExports.length) {
        throw new Error(`--start-index must be between 1 and ${nativeExports.length}`);
    }
    for (const entry of nativeExports.slice(startIndex - 1)) {
        let deferredRelocations = [];
        if (entry.repoId !== 'com.enonic.cms.default') {
            const preparation = await postImportAction(options['service-url'], sessionCookie, {
                action: 'prepare-project-import',
                repository: entry.repoId,
                branch: entry.sourceBranch,
                entries: manifest.entries.filter(
                    ({ repoId, branches }) =>
                        repoId === entry.repoId && branches.includes(entry.sourceBranch)
                ),
            });
            deferredRelocations = preparation.deferredRelocations;
        }
        importNativeExport(entry, auth, [], deferredRelocations);
        await postImportAction(options['service-url'], sessionCookie, {
            action: 'normalize-import-paths',
            repository: entry.repoId,
            branch: entry.sourceBranch,
            entries: manifest.entries.filter(
                ({ repoId, branches }) =>
                    repoId === entry.repoId && branches.includes(entry.sourceBranch)
            ),
        });
        const supplements = manifest.sanitizedSupplements.filter(
            ({ repoId, branch }) =>
                repoId === entry.repoId && branch === entry.sourceBranch
        );
        if (supplements.length > 0) {
            const result = await postImportAction(options['service-url'], sessionCookie, {
                action: 'restore-supplements',
                repository: entry.repoId,
                branch: entry.sourceBranch,
                supplements,
            });
            if (result.restoredSupplements.length !== supplements.length) {
                throw new Error(
                    `Expected ${supplements.length} restored supplements for ${entry.repoId}:${entry.sourceBranch}`
                );
            }
        }
    }

    const validation = await postImportAction(options['service-url'], sessionCookie, {
        action: 'validate-import',
        entries: manifest.entries,
        supplements: manifest.sanitizedSupplements,
    });
    if (
        validation.missingEntries !== 0 ||
        validation.pathMismatches !== 0 ||
        validation.errors.length !== 0
    ) {
        throw new Error(`Target validation failed: ${JSON.stringify(validation)}`);
    }

    console.log(
        `Imported ${nativeExports.length - startIndex + 1} repository branch exports from ${manifest.bundle}`
    );
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});

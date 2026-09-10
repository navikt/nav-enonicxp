#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCuratedSource } from './lib/curated-source-extractor.mjs';
import { getXpSessionCookie } from './lib/xp-session.mjs';
import { fetchXp } from './lib/curated-http.mjs';

const CONTENT_ROOT_PATH = '/content/www.nav.no';
const REQUIRED_PROJECTS = [
    { id: 'default', language: 'no', parents: [] },
    { id: 'navno-engelsk', language: 'en', parents: ['default'] },
    { id: 'navno-nynorsk', language: 'nn', parents: ['default'] },
];

const getArguments = () => {
    const args = process.argv.slice(2);
    const options = {};

    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        if (
            argument === '--dry' ||
            argument === '--plan-only' ||
            argument === '--write-supplements-only' ||
            argument === '--allow-missing-applications'
        ) {
            options[argument.slice(2)] = true;
            continue;
        }

        if (!argument.startsWith('--') || !args[index + 1]) {
            throw new Error(`Invalid argument: ${argument}`);
        }

        options[argument.slice(2)] = args[index + 1];
        index += 1;
    }

    return options;
};

const printUsage = () => {
    console.log(`Usage:
  ENONIC_AUTH='user:password' node scripts/create-curated-export.mjs \\
    --input popular-paths.txt \\
    --service-url https://portal-admin.example.no/_/service/no.nav.navno/curatedExportManifest \\
    --bundle prod-curated-YYYY-MM-DD \
    [--export-dir /new/local/export-directory] [--plan-only] [--allow-missing-applications]

Input can be a JSON array or a text file with one URL/path per line.
Editor selections use --seeds-file with repository/branch/contentId objects.
Both remote and local sources are read through the source service, never native management export.`);
};

const normalizePath = (value) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('#')) {
        return null;
    }

    let path = trimmed;
    if (/^https?:\/\//.test(trimmed)) {
        path = new URL(trimmed).pathname;
    } else {
        path = trimmed.split(/[?#]/, 1)[0];
    }

    if (path.startsWith('/content/www.nav.no')) {
        return path.slice('/content'.length);
    }
    if (path.startsWith('/www.nav.no')) {
        return path;
    }

    return `/www.nav.no${path.startsWith('/') ? path : `/${path}`}`;
};

const readPaths = (inputPath) => {
    const contents = readFileSync(inputPath, 'utf8');
    const values = inputPath.endsWith('.json') ? JSON.parse(contents) : contents.split(/\r?\n/);
    if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
        throw new Error('Input must contain a JSON array or one URL/path per line');
    }

    return [...new Set(values.map(normalizePath).filter(Boolean))];
};

const createExportName = (bundle, entry, index) => {
    const locale = entry.locale.replace(/[^a-zA-Z0-9-]/g, '-');
    return `${bundle}-${String(index + 1).padStart(2, '0')}-${locale}-${entry.sourceBranch}`;
};

const createNativeExports = (bundle, entries) => {
    const exportEntries = entries.flatMap((entry) =>
        entry.branches.map((sourceBranch) => ({
            ...entry,
            sourceBranch,
            sourcePath: entry.paths[sourceBranch],
        }))
    );
    const groups = exportEntries.reduce((byRepositoryAndBranch, entry) => {
        const key = `${entry.repoId}:${entry.sourceBranch}`;
        byRepositoryAndBranch[key] ||= {
            repoId: entry.repoId,
            locale: entry.locale,
            sourceBranch: entry.sourceBranch,
            entries: [],
        };
        byRepositoryAndBranch[key].entries.push(entry);
        return byRepositoryAndBranch;
    }, {});

    return Object.values(groups).map((group, index) => {
        const contentPath = CONTENT_ROOT_PATH;
        return {
            repoId: group.repoId,
            locale: group.locale,
            sourceBranch: group.sourceBranch,
            contentPath,
            importPath: dirname(contentPath),
            selectedContentPaths: group.entries.map(({ sourcePath }) => sourcePath),
            exportName: createExportName(bundle, group, index),
        };
    });
};

const validateManifest = (manifest, options) => {
    if (manifest.unresolvedPaths.length > 0) {
        throw new Error(`Manifest has ${manifest.unresolvedPaths.length} unresolved paths`);
    }
    if (manifest.missingContentTypes.length > 0) {
        throw new Error(`Manifest is missing ${manifest.missingContentTypes.length} content types`);
    }
    const unavailableApplications = manifest.applications.filter(
        ({ required, installed, started, version }) =>
            required !== false && (!installed || !started || !version)
    );
    if (unavailableApplications.length > 0 && !options['allow-missing-applications']) {
        throw new Error(
            `Required project applications are unavailable: ${unavailableApplications.map(({ key }) => key).join(', ')}`
        );
    }
    if (options['allow-missing-applications'] && !options['plan-only']) {
        throw new Error('--allow-missing-applications may only be used with --plan-only');
    }

    const projects = manifest.projects.map(({ id, language, parents = [] }) => ({
        id,
        language,
        parents,
    }));
    if (JSON.stringify(projects) !== JSON.stringify(REQUIRED_PROJECTS)) {
        throw new Error(`Manifest has unexpected project topology: ${JSON.stringify(projects)}`);
    }

    manifest.entries.forEach((entry) => {
        const validBranches =
            JSON.stringify(entry.branches) === JSON.stringify(['draft', 'master']) ||
            JSON.stringify(entry.branches) === JSON.stringify(['draft']) ||
            JSON.stringify(entry.branches) === JSON.stringify(['master']);
        if (!validBranches) {
            throw new Error(
                `Manifest entry ${entry.repoId}:${entry.contentId} has invalid branches ${entry.branches}`
            );
        }
        const pathBranches = Object.keys(entry.paths || {}).filter((branch) => entry.paths[branch]);
        if (
            JSON.stringify(pathBranches) !== JSON.stringify(entry.branches) ||
            entry.branches.some(
                (branch) =>
                    typeof entry.paths[branch] !== 'string' ||
                    (!entry.paths[branch].startsWith(`${CONTENT_ROOT_PATH}/`) &&
                        entry.paths[branch] !== CONTENT_ROOT_PATH)
            )
        ) {
            throw new Error(
                `Manifest entry ${entry.repoId}:${entry.contentId} has invalid branch paths`
            );
        }
    });
    if (!Array.isArray(manifest.sanitizedSupplements)) {
        throw new Error('Manifest sanitizedSupplements must be an array');
    }
    manifest.sanitizedSupplements.forEach((supplement) => {
        const selectedEntry = manifest.entries.find(
            ({ contentId, repoId, branches, paths }) =>
                contentId === supplement.contentId &&
                repoId === supplement.repoId &&
                branches.includes(supplement.branch) &&
                paths[supplement.branch] === supplement.contentPath
        );
        if (
            !selectedEntry ||
            !Array.isArray(supplement.invalidValuePaths) ||
            supplement.invalidValuePaths.length === 0 ||
            !supplement.node ||
            supplement.node._id !== supplement.contentId ||
            supplement.node._path !== supplement.contentPath
        ) {
            throw new Error(
                `Invalid sanitized supplement ${supplement.repoId}:${supplement.branch}:${supplement.contentId}`
            );
        }
    });
};

const createImportScript = (bundle) => {
    return `#!/usr/bin/env sh
set -eu

: "\${ENONIC_AUTH:?ENONIC_AUTH must use the format user:password}"
: "\${CURATED_IMPORT_SERVICE_URL:?Set CURATED_IMPORT_SERVICE_URL to the target curatedExportImport service}"
: "\${CURATED_TARGET_SANDBOX:?Set CURATED_TARGET_SANDBOX to the local target sandbox}"

node scripts/import-curated-export.mjs \
    --manifest '${bundle}.manifest.json' \
    --service-url "$CURATED_IMPORT_SERVICE_URL" \
    --sandbox "$CURATED_TARGET_SANDBOX" \
    "$@"
`;
};

const postJson = async (url, body, headers = {}) => {
    const response = await fetchXp(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        body: JSON.stringify(body),
    });
    const responseBody = await response.text();
    let parsedBody;
    try {
        parsedBody = JSON.parse(responseBody);
    } catch {
        throw new Error(
            `Expected JSON, got ${response.status} ${response.headers.get('content-type') || 'unknown content type'} from ${response.url}`
        );
    }
    return {
        ok: response.ok,
        status: response.status,
        headers: response.headers,
        body: parsedBody,
    };
};

const main = async () => {
    const options = getArguments();
    if (options['write-supplements-only'] || options['management-url'] || options.dry) {
        throw new Error(
            'Native management export and supplement-only repair are no longer supported. Use --plan-only or --export-dir with a fresh local directory; source data is fetched through the read-only service.'
        );
    }
    if ((!options.input && !options['seeds-file']) || !options['service-url'] || !options.bundle) {
        printUsage();
        process.exitCode = 1;
        return;
    }
    if (!/^(?!\.{1,2}$)[a-zA-Z0-9._-]+$/.test(options.bundle)) {
        throw new Error(
            '--bundle may only contain letters, numbers, dots, underscores, and hyphens'
        );
    }
    if (!options['plan-only'] && !options['export-dir']) {
        throw new Error('--export-dir is required when creating the archive');
    }
    if (!options['plan-only'] && existsSync(options['export-dir'])) {
        throw new Error('--export-dir must be a new local directory');
    }

    const auth = process.env.ENONIC_AUTH;
    if (!auth) {
        throw new Error('ENONIC_AUTH must be set to user:password');
    }

    const paths = options.input ? readPaths(options.input) : [];
    const seeds = options['seeds-file']
        ? JSON.parse(readFileSync(options['seeds-file'], 'utf8'))
        : [];
    if (!Array.isArray(seeds)) {
        throw new Error(
            '--seeds-file must contain an array of repository/branch/contentId selections'
        );
    }
    const sessionCookie = await getXpSessionCookie(options['service-url'], auth);
    const response = await postJson(
        options['service-url'],
        { paths, seeds, scope: options.scope ?? 'full' },
        { Cookie: sessionCookie }
    );

    const manifest = response.body;
    if (!response.ok) {
        throw new Error(
            `Manifest service returned ${response.status}: ${JSON.stringify(manifest)}`
        );
    }
    validateManifest(manifest, options);

    const nativeExports = createNativeExports(options.bundle, manifest.entries);
    const outputManifest = {
        ...manifest,
        formatVersion: 1,
        bundle: options.bundle,
        exports: nativeExports,
    };
    const manifestPath = `${options.bundle}.manifest.json`;
    if (!options['plan-only']) {
        const sourceUrl = new URL(options['source-service-url'] ?? options['service-url']);
        if (!options['source-service-url']) {
            if (!sourceUrl.pathname.endsWith('/curatedExportManifest')) {
                throw new Error('Set --source-service-url when using a custom manifest route');
            }
            sourceUrl.pathname = sourceUrl.pathname.replace(
                /curatedExportManifest$/,
                'curatedExportSource'
            );
        }
        const extraction = await extractCuratedSource({
            manifest: outputManifest,
            sourceServiceUrl: sourceUrl.href,
            auth,
            exportDirectory: resolve(options['export-dir']),
        });
        console.log(
            `Extracted ${extraction.nodeCount} nodes and ${extraction.binaryCount} binaries`
        );
    }
    writeFileSync(manifestPath, `${JSON.stringify(outputManifest, null, 2)}\n`);
    chmodSync(manifestPath, 0o600);

    if (!options['plan-only']) {
        const importScriptPath = `${options.bundle}.import.sh`;
        const archivePath = resolve(`${options.bundle}.tar.gz`);
        writeFileSync(importScriptPath, createImportScript(options.bundle), {
            mode: 0o755,
        });
        execFileSync(
            'tar',
            [
                '-czf',
                archivePath,
                '-C',
                resolve(options['export-dir']),
                ...nativeExports.map((entry) => entry.exportName),
                '-C',
                process.cwd(),
                manifestPath,
                importScriptPath,
                '-C',
                fileURLToPath(new URL('../', import.meta.url)),
                'scripts/import-curated-export.mjs',
                'scripts/lib/curated-auth.mjs',
                'scripts/lib/curated-http.mjs',
                'scripts/lib/curated-import-errors.mjs',
                'scripts/lib/curated-import-files.mjs',
                'scripts/lib/curated-import-expectations.mjs',
                'scripts/lib/curated-local-target.mjs',
                'scripts/lib/curated-projects.mjs',
                'scripts/lib/xp-session.mjs',
            ],
            { stdio: 'inherit' }
        );
        chmodSync(archivePath, 0o600);
        console.log(`Created bundle archive ${archivePath}`);
    }

    console.log(
        `Bundled ${manifest.entries.length} entries in ${nativeExports.length} native exports; manifest written to ${manifestPath}`
    );
    if (manifest.unresolvedPaths.length > 0) {
        console.warn(`Unresolved popular paths: ${manifest.unresolvedPaths.length}`);
    }
    if (manifest.missingContentTypes.length > 0) {
        console.warn(
            `Content types without a published representative: ${manifest.missingContentTypes.join(', ')}`
        );
    }
    if (manifest.excludedDependencies.length > 0) {
        console.warn(
            `Excluded broad container dependencies: ${manifest.excludedDependencies.length}`
        );
    }
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});

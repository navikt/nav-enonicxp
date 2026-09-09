#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { writeNativeNodeXml } from './lib/native-export.mjs';
import { getXpSessionCookie } from './lib/xp-session.mjs';

const CONTENT_ROOT_PATH = '/content/www.nav.no';
const RECURSIVE_EXPORT_REASONS = new Set(['office-editorial', 'decorator-menu']);
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
        --management-url https://xp-management.example.no \
    --bundle prod-curated-YYYY-MM-DD \
    [--export-dir /path/to/XP_HOME/data/export] [--dry] [--plan-only] [--allow-missing-applications]

Input can be a JSON array or a text file with one URL/path per line.`);
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

const createNativeExports = (bundle, entries, sanitizedSupplements) => {
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
            recursiveContentPaths: group.entries
                .filter(({ reason }) => RECURSIVE_EXPORT_REASONS.has(reason))
                .map(({ sourcePath }) => sourcePath),
            supplementContentPaths: sanitizedSupplements
                .filter(
                    ({ repoId, branch }) =>
                        repoId === group.repoId && branch === group.sourceBranch
                )
                .map(({ contentPath }) => contentPath),
            exportName: createExportName(bundle, group, index),
        };
    });
};

const findNodeXmlPaths = (path) =>
    readdirSync(path).flatMap((name) => {
        const childPath = resolve(path, name);
        if (statSync(childPath).isDirectory()) {
            return findNodeXmlPaths(childPath);
        }
        return name === 'node.xml' ? [childPath] : [];
    });

const filterNativeExport = (exportDir, nativeExport) => {
    const exportPath = resolve(exportDir, nativeExport.exportName);
    const nodeXmlPaths = findNodeXmlPaths(exportPath).sort(
        (left, right) => left.split('/').length - right.split('/').length
    );
    if (nodeXmlPaths.length === 0) {
        throw new Error(`Native export ${nativeExport.exportName} contains no node.xml`);
    }

    const contentRootPath = dirname(dirname(nodeXmlPaths[0]));
    const selectedContentPaths = new Set(nativeExport.selectedContentPaths);
    const retainedContentPaths = new Set();
    const shouldRetainPath = (contentPath) =>
        selectedContentPaths.has(contentPath) ||
        nativeExport.selectedContentPaths.some((path) => path.startsWith(`${contentPath}/`)) ||
        nativeExport.recursiveContentPaths.some(
            (path) => contentPath === path || contentPath.startsWith(`${path}/`)
        );
    const filterContentPath = (directoryPath, contentPath) => {
        retainedContentPaths.add(contentPath);
        readdirSync(directoryPath)
            .filter((name) => name !== '_')
            .forEach((name) => {
                const childDirectoryPath = resolve(directoryPath, name);
                const childContentPath = `${contentPath}/${name}`;
                if (!statSync(childDirectoryPath).isDirectory() || !shouldRetainPath(childContentPath)) {
                    rmSync(childDirectoryPath, { recursive: true, force: true });
                    return;
                }
                filterContentPath(childDirectoryPath, childContentPath);
            });

        const childOrderPath = resolve(directoryPath, '_', 'manualChildOrder.txt');
        if (existsSync(childOrderPath)) {
            const retainedChildNames = readdirSync(directoryPath).filter((name) => name !== '_');
            const childOrder = readFileSync(childOrderPath, 'utf8')
                .split(/\r?\n/)
                .filter((name) => retainedChildNames.includes(name));
            if (childOrder.length > 0) {
                writeFileSync(childOrderPath, `${childOrder.join('\n')}\n`);
            } else {
                writeFileSync(childOrderPath, '');
            }
        }
    };
    filterContentPath(contentRootPath, nativeExport.contentPath);

    const missingContentPaths = nativeExport.selectedContentPaths.filter(
        (contentPath) =>
            !retainedContentPaths.has(contentPath) &&
            !nativeExport.supplementContentPaths.includes(contentPath)
    );
    if (missingContentPaths.length > 0) {
        throw new Error(
            `Native export ${nativeExport.exportName} is missing selected paths after filtering: ${missingContentPaths.join(', ')}`
        );
    }
};

const writeSupplementNodeXml = (exportDir, nativeExport, supplement) => {
    const sourceNode = supplement.node;
    if (sourceNode.attachment || sourceNode.attachments) {
        throw new Error(`Supplement ${supplement.contentId} contains unsupported attachments`);
    }
    const relativePath = supplement.contentPath.slice('/content/'.length);
    const nodeDirectory = resolve(exportDir, nativeExport.exportName, relativePath, '_');
    writeNativeNodeXml(nodeDirectory, sourceNode);
};

const writeSupplementExports = (exportDir, nativeExports, supplements) => {
    supplements.forEach((supplement) => {
        const nativeExport = nativeExports.find(
            ({ repoId, sourceBranch }) =>
                repoId === supplement.repoId && sourceBranch === supplement.branch
        );
        if (!nativeExport) {
            throw new Error(`No native export found for supplement ${supplement.repoId}:${supplement.branch}`);
        }
        writeSupplementNodeXml(exportDir, nativeExport, supplement);
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
        ({ installed, started, version }) => !installed || !started || !version
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
                    !entry.paths[branch].startsWith(`${CONTENT_ROOT_PATH}/`) &&
                    entry.paths[branch] !== CONTENT_ROOT_PATH
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

node scripts/import-curated-export.mjs \
    --manifest '${bundle}.manifest.json' \
    --service-url "$CURATED_IMPORT_SERVICE_URL" \
    "$@"
`;
};

const postJson = async (url, body, headers = {}) => {
    const response = await fetch(url, {
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
    if (options['write-supplements-only']) {
        if (!options.manifest || !options['export-dir']) {
            throw new Error('--write-supplements-only requires --manifest and --export-dir');
        }
        const manifest = JSON.parse(readFileSync(options.manifest, 'utf8'));
        validateManifest(manifest, options);
        writeSupplementExports(options['export-dir'], manifest.exports, manifest.sanitizedSupplements);
        console.log(`Wrote ${manifest.sanitizedSupplements.length} native supplement nodes`);
        return;
    }
    if (!options.input || !options['service-url'] || !options.bundle) {
        printUsage();
        process.exitCode = 1;
        return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(options.bundle)) {
        throw new Error('--bundle may only contain letters, numbers, dots, underscores, and hyphens');
    }
    if (!options.dry && !options['plan-only'] && !options['export-dir']) {
        throw new Error('--export-dir is required when creating the archive');
    }
    if (!options['plan-only'] && !options['management-url']) {
        throw new Error('--management-url is required when running native exports');
    }
    if (options['management-url']) {
        new URL(options['management-url']);
    }

    const auth = process.env.ENONIC_AUTH;
    if (!auth) {
        throw new Error('ENONIC_AUTH must be set to user:password');
    }

    const paths = readPaths(options.input);
    const sessionCookie = await getXpSessionCookie(options['service-url'], auth);
    const response = await postJson(
        options['service-url'],
        { paths, scope: options.scope ?? 'full' },
        { Cookie: sessionCookie }
    );

    const manifest = response.body;
    if (!response.ok) {
        throw new Error(`Manifest service returned ${response.status}: ${JSON.stringify(manifest)}`);
    }
    validateManifest(manifest, options);

    const nativeExports = createNativeExports(
        options.bundle,
        manifest.entries,
        manifest.sanitizedSupplements
    );
    const outputManifest = {
        ...manifest,
        bundle: options.bundle,
        exports: nativeExports,
    };
    const manifestPath = `${options.bundle}.manifest.json`;
    writeFileSync(manifestPath, `${JSON.stringify(outputManifest, null, 2)}\n`);

    for (const entry of options['plan-only'] ? [] : nativeExports) {
        const args = [
            'export',
            '-t',
            entry.exportName,
            '--path',
            `${entry.repoId}:${entry.sourceBranch}:${entry.contentPath}`,
            '--skip-versions',
            '--force',
            '--auth',
            auth,
        ];
        if (options.dry) {
            args.push('--dry');
        }

        console.log(`Exporting ${entry.repoId}:${entry.sourceBranch}:${entry.contentPath}`);
        const exportResult = spawnSync('enonic', args, {
            encoding: 'utf8',
            env: {
                ...process.env,
                ENONIC_CLI_REMOTE_URL: options['management-url'],
            },
        });
        process.stdout.write(exportResult.stdout || '');
        process.stderr.write(exportResult.stderr || '');
        if (exportResult.status !== 0) {
            const exportOutput = `${exportResult.stdout || ''}\n${exportResult.stderr || ''}`;
            const isXp7ExportErrorsDecodeFailure =
                exportOutput.includes('cannot unmarshal string into Go struct field') &&
                exportOutput.includes('exportErrors');
            if (!isXp7ExportErrorsDecodeFailure || options.dry) {
                throw new Error(`Native export failed for ${entry.exportName}`);
            }
            console.warn(
                `XP reported export errors for ${entry.exportName}; validating selected paths against sanitized supplements`
            );
        }
        if (!options.dry) {
            filterNativeExport(options['export-dir'], entry);
        }
    }
    if (!options.dry && !options['plan-only']) {
        writeSupplementExports(options['export-dir'], nativeExports, manifest.sanitizedSupplements);
    }

    if (!options.dry && !options['plan-only']) {
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
                'scripts/import-curated-export.mjs',
                'scripts/lib/curated-import-errors.mjs',
                'scripts/lib/curated-projects.mjs',
            ],
            { stdio: 'inherit' }
        );
        console.log(`Created bundle archive ${archivePath}`);
    }

    console.log(
        `Bundled ${manifest.entries.length} entries in ${nativeExports.length} native exports; manifest written to ${manifestPath}`
    );
    if (manifest.unresolvedPaths.length > 0) {
        console.warn(`Unresolved popular paths: ${manifest.unresolvedPaths.length}`);
    }
    if (manifest.missingContentTypes.length > 0) {
        console.warn(`Content types without a published representative: ${manifest.missingContentTypes.join(', ')}`);
    }
    if (manifest.excludedDependencies.length > 0) {
        console.warn(`Excluded broad container dependencies: ${manifest.excludedDependencies.length}`);
    }
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
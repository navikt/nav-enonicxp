import { createHash, randomUUID } from 'node:crypto';
import {
    createReadStream,
    createWriteStream,
    existsSync,
    linkSync,
    mkdirSync,
    renameSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { updateNativeExpectation, writeNativeNodeXml } from './native-export.mjs';
import { getXpSessionCookie } from './xp-auth.mjs';
import { fetchXp } from './xp-http.mjs';

const BATCH_SIZE = 100;

const chunks = (values, size) => {
    const result = [];
    for (let index = 0; index < values.length; index += size) {
        result.push(values.slice(index, index + size));
    }
    return result;
};

const requestJson = async (url, cookie, options, fetchImpl) => {
    const response = await fetchImpl(url, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(120000),
        headers: {
            Cookie: cookie,
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
    const body = await response.json();
    if (!response.ok) {
        throw new Error(`${response.status} from ${url}: ${JSON.stringify(body)}`);
    }
    return body;
};

const getNodeDirectory = (exportRoot, contentPath) => {
    if (
        !(
            contentPath === '/content/www.nav.no' || contentPath.startsWith('/content/www.nav.no/')
        ) ||
        contentPath.split('/').some((segment) => segment === '.' || segment === '..')
    ) {
        throw new Error(`Node path is outside the curated root: ${contentPath}`);
    }
    return resolve(exportRoot, contentPath.slice('/content/'.length), '_');
};

export const writeManualChildOrders = (exportRoot, sources) => {
    const childrenByParent = new Map();
    sources.forEach((source) => {
        const parentPath = dirname(source.node._path);
        const children = childrenByParent.get(parentPath) || [];
        children.push(source);
        childrenByParent.set(parentPath, children);
    });

    sources
        .filter(({ node }) => /_manualordervalue/i.test(node._childOrder))
        .forEach(({ node: parent }) => {
            const expressions = parent._childOrder.split(',').map((expression) => {
                const match = expression.trim().match(/^([\w.]+)\s+(ASC|DESC)$/i);
                if (!match) {
                    throw new Error(`Unsupported manual child order: ${parent._childOrder}`);
                }
                return { field: match[1], direction: match[2].toUpperCase() === 'ASC' ? 1 : -1 };
            });
            const fieldValue = (source, field) => {
                if (field.toLowerCase() === '_manualordervalue') {
                    return source.manualOrderValue === null
                        ? null
                        : BigInt(source.manualOrderValue);
                }
                if (field.toLowerCase() === '_timestamp') {
                    const seconds = BigInt(Math.floor(Date.parse(source.node._ts) / 1000));
                    const fraction =
                        source.node._ts.match(/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/)?.[1] || '';
                    return seconds * 1000000000n + BigInt(`${fraction}000000000`.slice(0, 9));
                }
                return field.split('.').reduce((value, key) => value?.[key], source.node) ?? null;
            };
            const children = (childrenByParent.get(parent._path) || [])
                .slice()
                .sort((left, right) => {
                    for (const { field, direction } of expressions) {
                        const leftValue = fieldValue(left, field);
                        const rightValue = fieldValue(right, field);
                        if (leftValue === rightValue) {
                            continue;
                        }
                        if (leftValue === null || rightValue === null) {
                            return leftValue === null ? 1 : -1;
                        }
                        return (leftValue < rightValue ? -1 : 1) * direction;
                    }
                    return left.node._name.localeCompare(right.node._name);
                });
            writeFileSync(
                resolve(getNodeDirectory(exportRoot, parent._path), 'manualChildOrder.txt'),
                children.length > 0 ? `${children.map(({ node }) => node._name).join('\n')}\n` : ''
            );
            updateNativeExpectation(getNodeDirectory(exportRoot, parent._path), (expectation) => {
                expectation.manualChildOrder = children.map(({ node }) => ({
                    contentId: node._id,
                    contentPath: node._path,
                }));
            });
        });
};

const downloadBinary = async ({ sourceServiceUrl, cookie, request, cacheDirectory, fetchImpl }) => {
    const destination = resolve(request.nodeDirectory, 'bin', request.binaryReference);
    if (dirname(destination) !== resolve(request.nodeDirectory, 'bin')) {
        throw new Error(`Unsafe binary reference: ${request.binaryReference}`);
    }
    if (existsSync(destination)) {
        throw new Error(`Binary destination already exists in a fresh export: ${destination}`);
    }
    mkdirSync(cacheDirectory, { recursive: true });
    mkdirSync(dirname(destination), { recursive: true });
    if (request.sha512) {
        const cachedPath = resolve(cacheDirectory, request.sha512);
        if (existsSync(cachedPath)) {
            const cachedHash = createHash('sha512');
            let cachedSize = 0;
            for await (const chunk of createReadStream(cachedPath)) {
                cachedHash.update(chunk);
                cachedSize += chunk.length;
            }
            if (
                cachedHash.digest('hex') !== request.sha512 ||
                (request.size !== undefined && cachedSize !== request.size)
            ) {
                throw new Error(`Binary cache integrity mismatch: ${request.binaryReference}`);
            }
            linkSync(cachedPath, destination);
            return {
                reference: request.binaryReference,
                sha512: request.sha512,
                size: String(cachedSize),
            };
        }
    }

    const url = new URL(sourceServiceUrl);
    url.searchParams.set('repository', request.repository);
    url.searchParams.set('branch', request.branch);
    url.searchParams.set('contentId', request.contentId);
    url.searchParams.set('versionId', request.versionId);
    url.searchParams.set('binaryReference', request.binaryReference);
    const response = await fetchImpl(url, {
        headers: { Cookie: cookie },
        redirect: 'error',
        signal: AbortSignal.timeout(120000),
    });
    if (!response.ok || !response.body) {
        throw new Error(
            `Failed binary ${request.contentId}/${request.binaryReference}: ${response.status}`
        );
    }

    const temporaryPath = resolve(cacheDirectory, `.download-${randomUUID()}`);
    const hash = createHash('sha512');
    let size = 0;
    const hashingStream = new Transform({
        transform(chunk, _encoding, callback) {
            hash.update(chunk);
            size += chunk.length;
            callback(null, chunk);
        },
    });
    try {
        await pipeline(
            Readable.fromWeb(response.body),
            hashingStream,
            createWriteStream(temporaryPath, { flags: 'wx' })
        );
        const digest = hash.digest('hex');
        if (
            (request.sha512 && digest !== request.sha512) ||
            (request.size !== undefined && size !== request.size)
        ) {
            throw new Error(
                `Source binary integrity mismatch: ${request.contentId}/${request.binaryReference}`
            );
        }
        const cachePath = resolve(cacheDirectory, digest);
        if (!existsSync(cachePath)) {
            renameSync(temporaryPath, cachePath);
        }
        linkSync(cachePath, destination);
        return { reference: request.binaryReference, sha512: digest, size: String(size) };
    } finally {
        rmSync(temporaryPath, { force: true });
    }
};

const runWorkers = async (items, concurrency, worker) => {
    let nextIndex = 0;
    let failure;
    const run = async () => {
        while (!failure && nextIndex < items.length) {
            const item = items[nextIndex];
            nextIndex += 1;
            try {
                await worker(item);
            } catch (error) {
                failure = error;
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
    if (failure) {
        throw failure;
    }
};

const binaryMetadata = (source) => {
    const metadata = new Map();
    source.properties
        .filter(({ name, type }) => name === 'attachment' && type === 'property-set')
        .forEach(({ value }) => {
            if (!Array.isArray(value)) {
                return;
            }
            const fields = Object.fromEntries(
                value.map(({ name, value: fieldValue }) => [name, fieldValue])
            );
            if (typeof fields.binary === 'string') {
                metadata.set(fields.binary, {
                    sha512: /^[a-f0-9]{128}$/i.test(fields.sha512 || '')
                        ? fields.sha512.toLowerCase()
                        : undefined,
                    size: /^\d+$/.test(fields.size || '') ? Number(fields.size) : undefined,
                });
            }
        });
    return metadata;
};

export const extractCuratedSource = async ({
    manifest,
    sourceServiceUrl,
    auth,
    exportDirectory,
    binaryConcurrency = 4,
    fetchImpl = fetchXp,
    getSessionCookie = getXpSessionCookie,
}) => {
    if (!Number.isInteger(binaryConcurrency) || binaryConcurrency < 1 || binaryConcurrency > 16) {
        throw new Error('Binary concurrency must be an integer between 1 and 16');
    }
    const exportRoots = manifest.exports.map(({ exportName }) => {
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(exportName)) {
            throw new Error(`Invalid native export name: ${exportName}`);
        }
        return resolve(exportDirectory, exportName);
    });
    if (new Set(exportRoots).size !== exportRoots.length) {
        throw new Error('Duplicate native export directories');
    }
    const createdRoots = [];
    const binaryRequests = [];
    let nodeCount = 0;

    try {
        mkdirSync(exportDirectory, { recursive: true });
        for (const exportRoot of exportRoots) {
            mkdirSync(exportRoot);
            createdRoots.push(exportRoot);
        }
        const cookie = await getSessionCookie(sourceServiceUrl, auth);
        for (const nativeExport of manifest.exports) {
            const exportRoot = resolve(exportDirectory, nativeExport.exportName);
            writeFileSync(
                resolve(exportRoot, 'export.properties'),
                `xpVersion = ${manifest.xpVersion}\n`
            );
            const entries = manifest.entries.filter(
                (entry) =>
                    entry.repoId === nativeExport.repoId &&
                    entry.branches.includes(nativeExport.sourceBranch)
            );
            const exportedSources = [];

            for (const batch of chunks(entries, BATCH_SIZE)) {
                const versionIds = batch.map((entry) => {
                    const versionId = entry.versions?.[nativeExport.sourceBranch];
                    if (typeof versionId !== 'string' || !versionId) {
                        throw new Error(
                            `Manifest has no pinned ${nativeExport.sourceBranch} version for ${entry.contentId}`
                        );
                    }
                    return versionId;
                });
                const result = await requestJson(
                    sourceServiceUrl,
                    cookie,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            repository: nativeExport.repoId,
                            branch: nativeExport.sourceBranch,
                            contentIds: batch.map(({ contentId }) => contentId),
                            versionIds,
                        }),
                    },
                    fetchImpl
                );
                if (!Array.isArray(result.nodes) || result.nodes.length !== batch.length) {
                    throw new Error(
                        `Invalid source batch for ${nativeExport.repoId}:${nativeExport.sourceBranch}`
                    );
                }
                result.nodes.forEach((source, index) => {
                    const { node, binaryReferences } = source;
                    const entry = batch[index];
                    const expectedPath = entry.paths[nativeExport.sourceBranch];
                    if (
                        !node ||
                        node._id !== entry.contentId ||
                        node._path !== expectedPath ||
                        node._versionKey !== versionIds[index]
                    ) {
                        throw new Error(
                            `Source node mismatch for ${nativeExport.repoId}:${nativeExport.sourceBranch}:${entry.contentId}`
                        );
                    }
                    const nodeDirectory = getNodeDirectory(exportRoot, expectedPath);
                    writeNativeNodeXml(nodeDirectory, source);
                    if (
                        !Array.isArray(binaryReferences) ||
                        binaryReferences.some((reference) => typeof reference !== 'string')
                    ) {
                        throw new Error(`Invalid binary reference list for ${entry.contentId}`);
                    }
                    exportedSources.push({ node, manualOrderValue: source.manualOrderValue });
                    const attachments = binaryMetadata(source);
                    [...new Set(binaryReferences)].forEach((binaryReference) =>
                        binaryRequests.push({
                            repository: nativeExport.repoId,
                            branch: nativeExport.sourceBranch,
                            contentId: entry.contentId,
                            versionId: versionIds[index],
                            binaryReference,
                            nodeDirectory,
                            ...attachments.get(binaryReference),
                        })
                    );
                    nodeCount += 1;
                });
            }
            writeManualChildOrders(exportRoot, exportedSources);
        }

        const cacheDirectory = resolve(exportDirectory, '.binary-cache');
        let completedBinaries = 0;
        await runWorkers(binaryRequests, binaryConcurrency, async (request) => {
            const binary = await downloadBinary({
                sourceServiceUrl,
                cookie,
                request,
                cacheDirectory,
                fetchImpl,
            });
            updateNativeExpectation(request.nodeDirectory, (expectation) => {
                expectation.binaries = expectation.binaries.map((expected) =>
                    expected.reference === binary.reference ? binary : expected
                );
            });
            completedBinaries += 1;
            if (completedBinaries % 100 === 0 || completedBinaries === binaryRequests.length) {
                process.stdout.write(
                    `\rVerified binaries: ${completedBinaries}/${binaryRequests.length}`
                );
            }
        });
        if (binaryRequests.length > 0) {
            process.stdout.write('\n');
        }
        return { nodeCount, binaryCount: binaryRequests.length };
    } catch (error) {
        createdRoots.forEach((exportRoot) => rmSync(exportRoot, { recursive: true, force: true }));
        throw error;
    }
};

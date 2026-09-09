import { createHash, randomUUID } from 'node:crypto';
import {
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
import { writeNativeNodeXml } from './native-export.mjs';
import { getXpSessionCookie } from './xp-session.mjs';

const BATCH_SIZE = 100;

const chunks = (values, size) => {
    const result = [];
    for (let index = 0; index < values.length; index += size) {
        result.push(values.slice(index, index + size));
    }
    return result;
};

const requestJson = async (url, cookie, options) => {
    const response = await fetch(url, {
        ...options,
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

const getExport = (manifest, repository, branch) => {
    const nativeExport = manifest.exports.find(
        (entry) => entry.repoId === repository && entry.sourceBranch === branch
    );
    if (!nativeExport) {
        throw new Error(`Manifest has no export for ${repository}:${branch}`);
    }
    return nativeExport;
};

const getNodeDirectory = (exportRoot, contentPath) => {
    if (!contentPath.startsWith('/content/www.nav.no')) {
        throw new Error(`Node path is outside the curated root: ${contentPath}`);
    }
    return resolve(exportRoot, contentPath.slice('/content/'.length), '_');
};

export const writeManualChildOrders = (exportRoot, nodes) => {
    const childrenByParent = new Map();
    nodes.forEach((node) => {
        const parentPath = dirname(node._path);
        const children = childrenByParent.get(parentPath) || [];
        children.push(node);
        childrenByParent.set(parentPath, children);
    });

    nodes
        .filter((node) => String(node._childOrder || '').includes('_manualordervalue'))
        .forEach((parent) => {
            const children = (childrenByParent.get(parent._path) || []).sort(
                (left, right) =>
                    Number(right._manualOrderValue || 0) - Number(left._manualOrderValue || 0)
            );
            const childOrderPath = resolve(
                getNodeDirectory(exportRoot, parent._path),
                'manualChildOrder.txt'
            );
            writeFileSync(
                childOrderPath,
                children.length > 0 ? `${children.map(({ _name }) => _name).join('\n')}\n` : ''
            );
        });
};

const downloadBinary = async ({ sourceServiceUrl, cookie, request, cacheDirectory }) => {
    const destination = resolve(request.nodeDirectory, 'bin', request.binaryReference);
    if (dirname(destination) !== resolve(request.nodeDirectory, 'bin')) {
        throw new Error(`Unsafe binary reference: ${request.binaryReference}`);
    }
    if (existsSync(destination)) {
        return;
    }

    const url = new URL(sourceServiceUrl);
    url.searchParams.set('repository', request.repository);
    url.searchParams.set('branch', request.branch);
    url.searchParams.set('contentId', request.contentId);
    url.searchParams.set('binaryReference', request.binaryReference);
    const response = await fetch(url, { headers: { Cookie: cookie } });
    if (!response.ok || !response.body) {
        throw new Error(`Failed binary ${request.contentId}/${request.binaryReference}: ${response.status}`);
    }

    mkdirSync(cacheDirectory, { recursive: true });
    const temporaryPath = resolve(cacheDirectory, `.download-${randomUUID()}`);
    const hash = createHash('sha256');
    const hashingStream = new Transform({
        transform(chunk, _encoding, callback) {
            hash.update(chunk);
            callback(null, chunk);
        },
    });
    await pipeline(
        Readable.fromWeb(response.body),
        hashingStream,
        createWriteStream(temporaryPath, { flags: 'wx' })
    );
    const cachePath = resolve(cacheDirectory, hash.digest('hex'));
    if (existsSync(cachePath)) {
        rmSync(temporaryPath);
    } else {
        renameSync(temporaryPath, cachePath);
    }
    mkdirSync(dirname(destination), { recursive: true });
    linkSync(cachePath, destination);
};

const runWorkers = async (items, concurrency, worker) => {
    let nextIndex = 0;
    const run = async () => {
        while (nextIndex < items.length) {
            const item = items[nextIndex];
            nextIndex += 1;
            await worker(item);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
};

export const extractCuratedSource = async ({
    manifest,
    sourceServiceUrl,
    auth,
    exportDirectory,
    binaryConcurrency = 4,
}) => {
    const cookie = await getXpSessionCookie(sourceServiceUrl, auth);
    const supplements = new Map(
        manifest.sanitizedSupplements.map((supplement) => [
            `${supplement.repoId}:${supplement.branch}:${supplement.contentId}`,
            supplement.node,
        ])
    );
    const binaryRequests = [];
    let nodeCount = 0;

    for (const nativeExport of manifest.exports) {
        const exportRoot = resolve(exportDirectory, nativeExport.exportName);
        mkdirSync(exportRoot, { recursive: true });
        writeFileSync(resolve(exportRoot, 'export.properties'), `xpVersion = ${manifest.xpVersion}\n`);
        const entries = manifest.entries.filter(
            (entry) =>
                entry.repoId === nativeExport.repoId &&
                entry.branches.includes(nativeExport.sourceBranch)
        );
        const exportedNodes = [];

        for (const batch of chunks(entries, BATCH_SIZE)) {
            const result = await requestJson(sourceServiceUrl, cookie, {
                method: 'POST',
                body: JSON.stringify({
                    repository: nativeExport.repoId,
                    branch: nativeExport.sourceBranch,
                    contentIds: batch.map(({ contentId }) => contentId),
                }),
            });
            if (!Array.isArray(result.nodes) || result.nodes.length !== batch.length) {
                throw new Error(`Invalid source batch for ${nativeExport.repoId}:${nativeExport.sourceBranch}`);
            }
            result.nodes.forEach(({ node, binaryReferences }, index) => {
                const entry = batch[index];
                const expectedPath = entry.paths[nativeExport.sourceBranch];
                if (!node || node._id !== entry.contentId || node._path !== expectedPath) {
                    throw new Error(`Source node mismatch for ${nativeExport.repoId}:${nativeExport.sourceBranch}:${entry.contentId}`);
                }
                const sourceNode = supplements.get(
                    `${nativeExport.repoId}:${nativeExport.sourceBranch}:${entry.contentId}`
                ) || node;
                const nodeDirectory = getNodeDirectory(exportRoot, expectedPath);
                writeNativeNodeXml(nodeDirectory, sourceNode);
                exportedNodes.push(sourceNode);
                (binaryReferences || []).forEach((binaryReference) =>
                    binaryRequests.push({
                        repository: nativeExport.repoId,
                        branch: nativeExport.sourceBranch,
                        contentId: entry.contentId,
                        binaryReference,
                        nodeDirectory,
                    })
                );
                nodeCount += 1;
            });
        }
        if (manifest.scope !== 'page') {
            writeManualChildOrders(exportRoot, exportedNodes);
        }
    }

    const cacheDirectory = resolve(exportDirectory, '.binary-cache');
    let completedBinaries = 0;
    await runWorkers(binaryRequests, binaryConcurrency, async (request) => {
        await downloadBinary({ sourceServiceUrl, cookie, request, cacheDirectory });
        completedBinaries += 1;
        if (completedBinaries % 100 === 0 || completedBinaries === binaryRequests.length) {
            process.stdout.write(`\rDownloaded binaries: ${completedBinaries}/${binaryRequests.length}`);
        }
    });
    if (binaryRequests.length > 0) {
        process.stdout.write('\n');
    }

    return { nodeCount, binaryCount: binaryRequests.length };
};
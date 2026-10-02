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
import { setTimeout as sleep } from 'node:timers/promises';
import {
    directLocalFetch,
    fetchXp,
    getSourceAuthHeaders,
    getXpSessionCookie,
    isCuratedContentPath,
    isSafeName,
} from './common.mjs';

const PROPERTY_TYPES = new Set([
    'string',
    'boolean',
    'long',
    'double',
    'xml',
    'geoPoint',
    'dateTime',
    'localDateTime',
    'localDate',
    'localTime',
    'reference',
    'link',
    'binaryReference',
    'property-set',
]);

export const sanitizeXmlString = (value) =>
    Array.from(value)
        .filter((character) => {
            const code = character.codePointAt(0);
            return (
                code === 9 ||
                code === 10 ||
                code === 13 ||
                (code >= 0x20 && code <= 0xd7ff) ||
                (code >= 0xe000 && code <= 0xfffd) ||
                (code >= 0x10000 && code <= 0x10ffff)
            );
        })
        .join('');

const escapeXml = (value) =>
    String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;')
        .replaceAll('\r', '&#13;');

const serializeProperty = (property, indentation, parentPath) => {
    if (!property || typeof property.name !== 'string' || !PROPERTY_TYPES.has(property.type)) {
        throw new Error('Native export requires explicit XP property names and types');
    }
    const { name, type, value } = property;
    const propertyPath = `${parentPath}.${name}`;
    if (sanitizeXmlString(name) !== name) {
        throw new Error(`Invalid XML property name: ${JSON.stringify(name)}`);
    }
    const indent = ' '.repeat(indentation);
    const attributes = `name="${escapeXml(name)}"`;
    if (value === null) {
        return `${indent}<${type} isNull="true" ${attributes}/>\n`;
    }
    if (type === 'property-set') {
        if (!Array.isArray(value)) {
            throw new Error(`Expected typed property-set children at ${name}`);
        }
        return `${indent}<property-set ${attributes}>\n${value
            .map((child) => serializeProperty(child, indentation + 4, propertyPath))
            .join('')}${indent}</property-set>\n`;
    }
    if (typeof value !== 'string') {
        throw new Error(
            `Expected an exact lexical XP value at ${propertyPath} (XP type ${type}, received ${typeof value}); numbers must not pass through JSON doubles`
        );
    }
    const sanitized = sanitizeXmlString(value);
    if (sanitized !== value && type !== 'string' && type !== 'xml') {
        throw new Error(`Invalid XML characters in non-text property ${name}`);
    }
    return `${indent}<${type} ${attributes}>${escapeXml(sanitized)}</${type}>\n`;
};

const serializeIndexConfig = (config, indentation) => {
    const indent = ' '.repeat(indentation);
    const scalarFields = ['decideByType', 'enabled', 'nGram', 'fulltext', 'includeInAllText'];
    const scalars = scalarFields
        .filter((name) => config[name] !== undefined)
        .map((name) => `${indent}<${name}>${Boolean(config[name])}</${name}>\n`)
        .join('');
    const processors =
        (config.indexValueProcessors || []).length === 0
            ? ''
            : `${indent}<indexValueProcessors>\n${config.indexValueProcessors
                  .map(
                      (value) =>
                          `${indent}    <indexValueProcessor>${escapeXml(value)}</indexValueProcessor>\n`
                  )
                  .join('')}${indent}</indexValueProcessors>\n`;
    const languages =
        (config.languages || []).length === 0
            ? ''
            : `${indent}<languages>\n${config.languages
                  .map((value) => `${indent}    <language>${escapeXml(value)}</language>\n`)
                  .join('')}${indent}</languages>\n`;
    return `${scalars}${processors}${languages}`;
};

export const writeNativeNodeXml = (nodeDirectory, source) => {
    if (!source?.node || !Array.isArray(source.properties)) {
        throw new Error(
            'A typed curated source envelope is required; untyped JSON cannot be exported faithfully'
        );
    }
    const sourceNode = source.node;
    const indexConfig = sourceNode._indexConfig;
    if (!indexConfig?.default || !Array.isArray(indexConfig.configs) || !indexConfig.allText) {
        throw new Error(
            `Missing source index configuration for ${sourceNode._id} at ${sourceNode._path} (received: ${Object.keys(indexConfig ?? {}).join(', ') || 'nothing'})`
        );
    }
    for (const name of ['_id', '_nodeType', '_childOrder', '_ts', '_versionKey']) {
        if (
            typeof sourceNode[name] !== 'string' ||
            sanitizeXmlString(sourceNode[name]) !== sourceNode[name]
        ) {
            throw new Error(`Missing or invalid node metadata ${name}`);
        }
    }
    if (!Number.isFinite(Date.parse(sourceNode._ts))) {
        throw new Error(`Invalid node timestamp for ${sourceNode._id}`);
    }
    const permissions = (sourceNode._permissions || [])
        .map(
            ({ principal, allow = [], deny = [] }) =>
                `        <principal key="${escapeXml(principal)}">
            <allow type="array">\n${allow.map((value) => `                <value>${escapeXml(value)}</value>\n`).join('')}            </allow>
            <deny type="array">\n${deny.map((value) => `                <value>${escapeXml(value)}</value>\n`).join('')}            </deny>
        </principal>\n`
        )
        .join('');
    const data = source.properties
        .map((property) =>
            serializeProperty(property, 8, `${sourceNode._path} [${sourceNode._id}]`)
        )
        .join('');
    const indexConfigs = `<indexConfigs>
        <analyzer>${escapeXml(indexConfig.analyzer || 'document_index_default')}</analyzer>
        <defaultConfig>
${serializeIndexConfig(indexConfig.default, 12)}        </defaultConfig>
        <pathIndexConfigs>
${indexConfig.configs
    .map(
        ({ path, config }) => `            <pathIndexConfig>
                <indexConfig>
${serializeIndexConfig(config, 20)}                </indexConfig>
                <path>${escapeXml(path)}</path>
            </pathIndexConfig>\n`
    )
    .join('')}        </pathIndexConfigs>
        <allTextIndexConfig>
${serializeIndexConfig(indexConfig.allText, 12)}        </allTextIndexConfig>
    </indexConfigs>`;
    const xml = `<node>
    <id>${escapeXml(sourceNode._id)}</id>
    <childOrder>${escapeXml(sourceNode._childOrder)}</childOrder>
    <nodeType>${escapeXml(sourceNode._nodeType)}</nodeType>
    <timestamp>${escapeXml(sourceNode._ts)}</timestamp>
    <inheritPermissions>${sourceNode._inheritsPermissions !== false}</inheritPermissions>
    <permissions>
${permissions}    </permissions>
    <data>
${data}    </data>
    ${indexConfigs}
</node>\n`;
    mkdirSync(nodeDirectory, { recursive: true });
    writeFileSync(resolve(nodeDirectory, 'node.xml'), xml);
    // Native import skips this metadata on pre-existing nodes, so keep it for the restore step.
    writeFileSync(
        resolve(nodeDirectory, 'curated-metadata.json'),
        JSON.stringify({
            contentId: sourceNode._id,
            contentPath: sourceNode._path,
            versionId: sourceNode._versionKey,
            childOrder: sourceNode._childOrder,
            manualOrderValue: source.manualOrderValue,
            indexConfig,
            nodeType: sourceNode._nodeType,
        })
    );
};

const BATCH_SIZE = 100;

const chunks = (values, size) => {
    const result = [];
    for (let index = 0; index < values.length; index += size) {
        result.push(values.slice(index, index + size));
    }
    return result;
};

// Deployed sources sit behind proxies that drop connections or answer 502-504 during
// restarts and load spikes. Every source request is a read, so repeating it is safe.
const RETRY_DELAYS_MS = [2000, 5000];
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'EPIPE',
    'ETIMEDOUT',
    'UND_ERR_SOCKET',
]);

const httpError = (message, status) =>
    Object.assign(new Error(message), { retryable: RETRYABLE_STATUSES.has(status) });

const isRetryableError = (error) =>
    error?.retryable === true ||
    // Undici reports network failures as TypeError('fetch failed') before the response and
    // TypeError('terminated') when the body stream is cut off.
    (error instanceof TypeError && ['fetch failed', 'terminated'].includes(error.message)) ||
    RETRYABLE_ERROR_CODES.has(error?.code) ||
    RETRYABLE_ERROR_CODES.has(error?.cause?.code);

const withRetries = async (description, operation, retryDelaysMs) => {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            const attempts = retryDelaysMs.length + 1;
            if (!isRetryableError(error) || attempt === attempts) {
                const attemptInfo = attempt > 1 ? ` after ${attempt} attempts` : '';
                error.message = `${description} failed${attemptInfo}: ${error.message}`;
                throw error;
            }
            const reason = error.cause?.message || error.message;
            console.warn(
                `\nRetrying ${description} (attempt ${attempt + 1}/${attempts}): ${reason}`
            );
            await sleep(retryDelaysMs[attempt - 1]);
        }
    }
};

const requestJson = async (url, authHeaders, options, fetchImpl) => {
    const response = await fetchImpl(url, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(120000),
        headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
    // Read text first: proxies answer errors with HTML, which would hide the status code.
    const text = await response.text();
    if (!response.ok) {
        throw httpError(`${response.status} from ${url}: ${text.slice(0, 500)}`, response.status);
    }
    return JSON.parse(text);
};

const getNodeDirectory = (exportRoot, contentPath) => {
    if (!isCuratedContentPath(contentPath)) {
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
        });
};

const downloadBinary = async ({
    sourceServiceUrl,
    authHeaders,
    request,
    cacheDirectory,
    fetchImpl,
}) => {
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
        headers: authHeaders,
        redirect: 'error',
        signal: AbortSignal.timeout(120000),
    });
    if (!response.ok || !response.body) {
        throw httpError(`HTTP ${response.status}`, response.status);
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

const BINARY_CONCURRENCY = 4;

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
    fetchImpl = fetchXp,
    getAuthHeaders = getSourceAuthHeaders,
    retryDelaysMs = RETRY_DELAYS_MS,
}) => {
    const exportRoots = manifest.exports.map(({ exportName }) => {
        if (!isSafeName(exportName)) {
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
        const authHeaders = await getAuthHeaders(sourceServiceUrl, auth);
        const entriesByExport = manifest.exports.map((nativeExport) =>
            manifest.entries.filter(
                (entry) =>
                    entry.repoId === nativeExport.repoId &&
                    entry.branches.includes(nativeExport.sourceBranch)
            )
        );
        const totalNodes = entriesByExport.reduce((sum, entries) => sum + entries.length, 0);
        for (const [exportIndex, nativeExport] of manifest.exports.entries()) {
            const exportRoot = resolve(exportDirectory, nativeExport.exportName);
            writeFileSync(
                resolve(exportRoot, 'export.properties'),
                `xpVersion = ${manifest.xpVersion}\n`
            );
            const entries = entriesByExport[exportIndex];
            const exportedSources = [];
            // Without drafts, the manifest mirrors master into draft, so draft data is read from master.
            const readBranch =
                manifest.includeDrafts === true ? nativeExport.sourceBranch : 'master';
            const batches = chunks(entries, BATCH_SIZE);

            for (const [batchIndex, batch] of batches.entries()) {
                const versionIds = batch.map((entry) => {
                    const versionId = entry.versions?.[nativeExport.sourceBranch];
                    if (typeof versionId !== 'string' || !versionId) {
                        throw new Error(
                            `Manifest has no pinned ${nativeExport.sourceBranch} version for ${entry.contentId}`
                        );
                    }
                    return versionId;
                });
                const result = await withRetries(
                    `Node batch ${batchIndex + 1}/${batches.length} for ${nativeExport.repoId}:${readBranch}`,
                    () =>
                        requestJson(
                            sourceServiceUrl,
                            authHeaders,
                            {
                                method: 'POST',
                                body: JSON.stringify({
                                    repository: nativeExport.repoId,
                                    branch: readBranch,
                                    contentIds: batch.map(({ contentId }) => contentId),
                                    versionIds,
                                }),
                            },
                            fetchImpl
                        ),
                    retryDelaysMs
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
                    try {
                        writeNativeNodeXml(nodeDirectory, source);
                    } catch (error) {
                        error.message += ` in ${nativeExport.repoId}:${nativeExport.sourceBranch}`;
                        throw error;
                    }
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
                            branch: readBranch,
                            contentId: entry.contentId,
                            versionId: versionIds[index],
                            binaryReference,
                            nodeDirectory,
                            ...attachments.get(binaryReference),
                        })
                    );
                    nodeCount += 1;
                });
                process.stdout.write(`\rDownloaded nodes: ${nodeCount}/${totalNodes}`);
            }
            writeManualChildOrders(exportRoot, exportedSources);
        }
        if (totalNodes > 0) {
            process.stdout.write('\n');
        }

        const cacheDirectory = resolve(exportDirectory, '.binary-cache');
        let completedBinaries = 0;
        await runWorkers(binaryRequests, BINARY_CONCURRENCY, async (request) => {
            await withRetries(
                `Binary ${request.contentId}/${request.binaryReference}`,
                () =>
                    downloadBinary({
                        sourceServiceUrl,
                        authHeaders,
                        request,
                        cacheDirectory,
                        fetchImpl,
                    }),
                retryDelaysMs
            );
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

const getIconUrl = (serviceUrl, projectId) =>
    new URL(`/admin/rest-v2/cs/project/icon/${encodeURIComponent(projectId)}`, serviceUrl);

export const downloadProjectIcons = async ({
    sourceServiceUrl,
    projects,
    auth,
    fetchRequest = fetchXp,
    getSessionCookie = getXpSessionCookie,
}) => {
    if (projects.length === 0) {
        return [];
    }
    const cookie = await getSessionCookie(sourceServiceUrl, auth);
    const projectResponse = await fetchRequest(
        new URL('/admin/rest-v2/cs/project/list', sourceServiceUrl),
        { headers: { Cookie: cookie } }
    );
    if (!projectResponse.ok) {
        throw new Error(`Could not list project icons: ${projectResponse.status}`);
    }
    const sourceProjects = (await projectResponse.json()).projects;
    if (!Array.isArray(sourceProjects)) {
        throw new Error('Invalid Content Studio project list');
    }
    const icons = [];
    for (const project of projects) {
        const sourceProject = sourceProjects.find(({ name }) => name === project.id);
        if (!sourceProject) {
            throw new Error(
                `Project ${project.id} is missing from the Content Studio project list`
            );
        }
        // Content Studio renders language flags itself when there is no uploaded icon.
        // Calling the attachment endpoint for those projects returns HTTP 500 on XP7.
        if (!sourceProject.icon) {
            continue;
        }
        const response = await fetchRequest(getIconUrl(sourceServiceUrl, project.id), {
            headers: { Cookie: cookie },
        });
        if (!response.ok) {
            throw new Error(`Could not read icon for project ${project.id}: ${response.status}`);
        }
        icons.push({
            projectId: project.id,
            contentType: response.headers.get('content-type') || 'application/octet-stream',
            data: Buffer.from(await response.arrayBuffer()),
        });
    }
    return icons;
};

export const uploadProjectIcons = async ({
    targetServiceUrl,
    icons,
    auth,
    fetchRequest = directLocalFetch,
    getSessionCookie = getXpSessionCookie,
}) => {
    if (icons.length === 0) {
        return;
    }
    const cookie = await getSessionCookie(targetServiceUrl, auth);
    const url = new URL('/admin/rest-v2/cs/project/modifyIcon', targetServiceUrl);
    for (const icon of icons) {
        const form = new FormData();
        form.set('name', icon.projectId);
        form.set('scaleWidth', '512');
        form.set(
            'icon',
            new Blob([icon.data], { type: icon.contentType }),
            `${icon.projectId}-icon`
        );
        const response = await fetchRequest(url, {
            method: 'POST',
            headers: { Cookie: cookie },
            body: form,
        });
        if (!response.ok) {
            throw new Error(
                `Could not restore icon for project ${icon.projectId}: ${response.status}`
            );
        }
    }
};

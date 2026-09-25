import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
        throw new Error(`Missing source index configuration for ${sourceNode._id}`);
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

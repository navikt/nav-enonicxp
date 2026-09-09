import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const escapeXml = (value) =>
    String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');

const DATE_TIME_FIELDS = new Set(['createdTime', 'modifiedTime', 'first', 'from', 'to']);
const REFERENCE_FIELDS = new Set(['link']);
const BINARY_REFERENCE_FIELDS = new Set(['binary']);
const LOCAL_TIME_PATTERN = /^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

const serializeProperty = (name, value, indentation) => {
    const indent = ' '.repeat(indentation);
    if (Array.isArray(value)) {
        return value.map((item) => serializeProperty(name, item, indentation)).join('');
    }
    if (value === null) {
        return `${indent}<string isNull="true" name="${escapeXml(name)}"/>\n`;
    }
    if (typeof value === 'object') {
        const properties = Object.entries(value)
            .map(([childName, childValue]) => serializeProperty(childName, childValue, indentation + 4))
            .join('');
        return properties
            ? `${indent}<property-set name="${escapeXml(name)}">\n${properties}${indent}</property-set>\n`
            : `${indent}<property-set name="${escapeXml(name)}"/>\n`;
    }
    const type =
        typeof value === 'boolean'
            ? 'boolean'
            : typeof value === 'number'
              ? 'double'
                            : (name === 'from' || name === 'to') && LOCAL_TIME_PATTERN.test(value)
                                ? 'localTime'
                                : DATE_TIME_FIELDS.has(name)
                ? 'dateTime'
                : REFERENCE_FIELDS.has(name)
                  ? 'reference'
                                    : BINARY_REFERENCE_FIELDS.has(name)
                                        ? 'binaryReference'
                  : 'string';
    if (!['string', 'boolean', 'number'].includes(typeof value)) {
        throw new Error(`Unsupported native export value type ${typeof value} at ${name}`);
    }
    const serializedValue = type === 'localTime'
        ? /^\d{2}:\d{2}$/.test(value)
            ? `${value}:00.000`
            : /^\d{2}:\d{2}:\d{2}$/.test(value)
              ? `${value}.000`
              : value
        : value;
    return `${indent}<${type} name="${escapeXml(name)}">${escapeXml(serializedValue)}</${type}>\n`;
};

const serializeIndexConfig = (config, indentation) => {
    const indent = ' '.repeat(indentation);
    const scalarFields = ['decideByType', 'enabled', 'nGram', 'fulltext', 'includeInAllText'];
    const scalars = scalarFields
        .filter((name) => config[name] !== undefined)
        .map((name) => `${indent}<${name}>${config[name]}</${name}>\n`)
        .join('');
    const processors = (config.indexValueProcessors || []).length === 0
        ? ''
        : `${indent}<indexValueProcessors>\n${config.indexValueProcessors.map((value) => `${indent}    <indexValueProcessor>${escapeXml(value)}</indexValueProcessor>\n`).join('')}${indent}</indexValueProcessors>\n`;
    const languages = (config.languages || []).length === 0
        ? ''
        : `${indent}<languages>\n${config.languages.map((value) => `${indent}    <language>${escapeXml(value)}</language>\n`).join('')}${indent}</languages>\n`;
    return `${scalars}${processors}${languages}`;
};

const updateParentChildOrder = (nodeDirectory, nodeName) => {
    const childOrderPath = resolve(dirname(dirname(nodeDirectory)), '_', 'manualChildOrder.txt');
    if (!existsSync(childOrderPath)) {
        return;
    }
    const childNames = readFileSync(childOrderPath, 'utf8').split(/\r?\n/).filter(Boolean);
    if (!childNames.includes(nodeName)) {
        writeFileSync(childOrderPath, `${childNames.concat(nodeName).join('\n')}\n`);
    }
};

export const writeNativeNodeXml = (nodeDirectory, sourceNode) => {
    mkdirSync(nodeDirectory, { recursive: true });
    updateParentChildOrder(nodeDirectory, sourceNode._name);
    const permissions = (sourceNode._permissions || [])
        .map(
            ({ principal, allow = [], deny = [] }) => `        <principal key="${escapeXml(principal)}">
            <allow type="array">\n${allow.map((value) => `                <value>${escapeXml(value)}</value>\n`).join('')}            </allow>
            <deny type="array">\n${deny.map((value) => `                <value>${escapeXml(value)}</value>\n`).join('')}            </deny>
        </principal>\n`
        )
        .join('');
    const data = Object.entries(sourceNode)
        .filter(([name]) => !name.startsWith('_') && !['attachments', 'hasChildren'].includes(name))
        .map(([name, value]) => serializeProperty(name, value, 8))
        .join('');
    const manualOrderValue = sourceNode._manualOrderValue === undefined
        ? ''
        : serializeProperty('manualOrderValue', sourceNode._manualOrderValue, 8);
    const indexConfig = sourceNode._indexConfig || {};
    const indexConfigs = `<indexConfigs>
        <analyzer>${escapeXml(indexConfig.analyzer || 'document_index_default')}</analyzer>
        <defaultConfig>
${serializeIndexConfig(indexConfig.default || {}, 12)}        </defaultConfig>
        <pathIndexConfigs>
${(indexConfig.configs || []).map(({ path, config }) => `            <pathIndexConfig>
                <indexConfig>
${serializeIndexConfig(config, 20)}                </indexConfig>
                <path>${escapeXml(path)}</path>
            </pathIndexConfig>\n`).join('')}        </pathIndexConfigs>
        <allTextIndexConfig>
${serializeIndexConfig(indexConfig.allText || {}, 12)}        </allTextIndexConfig>
    </indexConfigs>`;
    const xml = `<node>
    <id>${escapeXml(sourceNode._id)}</id>
    <childOrder>${escapeXml(sourceNode._childOrder || '_name ASC')}</childOrder>
    <nodeType>content</nodeType>
    <timestamp>${escapeXml(new Date(sourceNode._ts).toISOString())}</timestamp>
    <inheritPermissions>${sourceNode._inheritsPermissions !== false}</inheritPermissions>
    <permissions>
${permissions}    </permissions>
    <data>
${manualOrderValue}${data}    </data>
    ${indexConfigs}
</node>\n`;
    writeFileSync(resolve(nodeDirectory, 'node.xml'), xml);
};
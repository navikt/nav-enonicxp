import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { sanitizeXmlString, writeNativeNodeXml } from '../lib/native-export.mjs';
import { writeManualChildOrders } from '../lib/source-extractor.mjs';
import { createSourceNode } from './fixtures/source-node.mjs';

const directory = (t) => {
    const path = resolve('scripts/sandbox/tests', `.native-export-${randomUUID()}`);
    mkdirSync(path, { recursive: true });
    t.after(() => rmSync(path, { recursive: true, force: true }));
    return path;
};

test('writes actual XP types without guessing from field names', (t) => {
    const path = directory(t);
    const source = createSourceNode();
    source.properties.push(
        { name: 'from', type: 'string', value: 'Not a time' },
        { name: 'link', type: 'string', value: 'Not a reference' },
        { name: 'notDate', type: 'dateTime', value: '2026-09-08T00:00:00.000Z' },
        { name: 'maximum', type: 'long', value: '9223372036854775807' },
        { name: 'decimal', type: 'double', value: '2.5' },
        { name: 'enabled', type: 'boolean', value: 'true' },
        { name: 'lineEndings', type: 'string', value: 'first\r\nsecond' },
        { name: 'location', type: 'geoPoint', value: '59.9,10.7' },
        { name: 'local', type: 'localDateTime', value: '2026-09-08T00:00:00.000Z' },
        { name: 'url', type: 'link', value: '/content/path' }
    );
    writeNativeNodeXml(path, source);
    const xml = readFileSync(join(path, 'node.xml'), 'utf8');
    assert.match(xml, /<reference name="icon">image-id<\/reference>/);
    assert.match(xml, /<string name="link">Not a reference<\/string>/);
    assert.match(xml, /<string name="from">Not a time<\/string>/);
    assert.match(xml, /<dateTime name="notDate">2026-09-08T00:00:00\.000Z<\/dateTime>/);
    assert.match(xml, /<long name="maximum">9223372036854775807<\/long>/);
    assert.match(xml, /<localDate name="date">2026-09-08Z<\/localDate>/);
    assert.match(xml, /A &amp; B 😀/);
    assert.match(xml, /first&#13;\nsecond/);
    assert.match(xml, /<path>data\.title<\/path>/);
});

test('preserves property cardinality and typed nulls', (t) => {
    const path = directory(t);
    const source = createSourceNode();
    source.properties = [
        { name: 'target', type: 'reference', value: null },
        { name: 'target', type: 'reference', value: 'id' },
        { name: 'group', type: 'property-set', value: null },
        { name: 'group', type: 'property-set', value: [] },
    ];
    writeNativeNodeXml(path, source);
    const xml = readFileSync(join(path, 'node.xml'), 'utf8');
    assert.match(xml, /<reference isNull="true" name="target"\/>/);
    assert.match(xml, /<reference name="target">id<\/reference>/);
    assert.match(xml, /<property-set isNull="true" name="group"\/>/);
    assert.match(xml, /<property-set name="group">\s*<\/property-set>/);
});

test('sanitizes text values including attachment text without damaging supplementary Unicode', (t) => {
    const path = directory(t);
    const source = createSourceNode();
    source.properties = [
        {
            name: 'attachment',
            type: 'property-set',
            value: [
                { name: 'binary', type: 'binaryReference', value: 'file.pdf' },
                { name: 'text', type: 'string', value: '😀before\u0002after𐐷\ud800' },
            ],
        },
    ];
    writeNativeNodeXml(path, source);
    const xml = readFileSync(join(path, 'node.xml'), 'utf8');
    assert.match(xml, /😀beforeafter𐐷/);
    assert.match(xml, /<binaryReference name="binary">file.pdf<\/binaryReference>/);
    assert.equal(sanitizeXmlString('\ud800\udc00\ud800\u0000\ufffe'), '𐀀');
    const expectation = JSON.parse(readFileSync(join(path, 'curated-metadata.json'), 'utf8'));
    assert.deepEqual(Object.keys(expectation).sort(), [
        'childOrder',
        'contentId',
        'contentPath',
        'indexConfig',
        'manualOrderValue',
        'nodeType',
        'versionId',
    ]);
});

test('rejects missing type/index metadata and JSON number coercion', (t) => {
    const path = directory(t);
    assert.throws(() => writeNativeNodeXml(path, createSourceNode().node), /typed curated source/);
    const source = createSourceNode();
    delete source.node._indexConfig;
    assert.throws(() => writeNativeNodeXml(path, source), /index configuration/);
    const coerced = createSourceNode();
    // eslint-disable-next-line no-loss-of-precision -- deliberately testing rejection of precision-losing JSON numbers
    coerced.properties = [{ name: 'integer', type: 'long', value: 9223372036854775807 }];
    assert.throws(() => writeNativeNodeXml(path, coerced), /lexical XP value/);
});

test('identifies the node, nested property and value shape when a null was omitted', (t) => {
    const path = directory(t);
    const source = createSourceNode({ _id: 'page-id', _path: '/content/www.nav.no/page' });
    source.properties = [
        { name: 'publish', type: 'property-set', value: [{ name: 'to', type: 'dateTime' }] },
    ];
    assert.throws(
        () => writeNativeNodeXml(path, source),
        /\/content\/www\.nav\.no\/page \[page-id\]\.publish\.to \(XP type dateTime, received undefined\)/
    );
});

test('persists metadata for existing-node restore instead of inventing a manualOrderValue data property', (t) => {
    const path = directory(t);
    const source = createSourceNode({ _ts: '2026-09-08T08:00:00.123456789Z' });
    source.manualOrderValue = '9223372036854775807';
    writeNativeNodeXml(path, source);
    assert.doesNotMatch(readFileSync(join(path, 'node.xml'), 'utf8'), /name="manualOrderValue"/);
    assert.match(
        readFileSync(join(path, 'node.xml'), 'utf8'),
        /<timestamp>2026-09-08T08:00:00\.123456789Z<\/timestamp>/
    );
    assert.equal(
        JSON.parse(readFileSync(join(path, 'curated-metadata.json'), 'utf8')).manualOrderValue,
        '9223372036854775807'
    );
});

for (const direction of ['DESC', 'ASC']) {
    test(`writes exact 64-bit manual child order ${direction}`, (t) => {
        const root = directory(t);
        const parent = createSourceNode({
            _id: 'parent',
            _path: '/content/www.nav.no/menu',
            _name: 'menu',
            _childOrder: `_manualordervalue ${direction}, _timestamp DESC`,
        });
        const first = createSourceNode({
            _id: 'first',
            _path: '/content/www.nav.no/menu/first',
            _name: 'first',
        });
        first.manualOrderValue = '9223372036854775807';
        const second = createSourceNode({
            _id: 'second',
            _path: '/content/www.nav.no/menu/second',
            _name: 'second',
        });
        second.manualOrderValue = '9223372036854775806';
        [parent, first, second].forEach((source) =>
            writeNativeNodeXml(join(root, source.node._path.slice('/content/'.length), '_'), source)
        );
        writeManualChildOrders(root, [parent, second, first]);
        assert.equal(
            readFileSync(join(root, 'www.nav.no/menu/_/manualChildOrder.txt'), 'utf8'),
            direction === 'DESC' ? 'first\nsecond\n' : 'second\nfirst\n'
        );
    });
}

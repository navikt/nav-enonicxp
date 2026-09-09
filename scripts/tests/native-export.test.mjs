import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { writeNativeNodeXml } from '../lib/native-export.mjs';
import { writeManualChildOrders } from '../lib/curated-source-extractor.mjs';

const createNode = () => ({
    _id: 'content-id',
    _name: 'page',
    _ts: '2026-08-12T08:00:00Z',
    _childOrder: '_name ASC',
    _inheritsPermissions: true,
    _permissions: [{ principal: 'role:system.everyone', allow: ['READ'], deny: [] }],
    _indexConfig: {
        analyzer: 'document_index_default',
        default: { enabled: true },
        configs: [],
        allText: { enabled: true },
    },
    type: 'no.nav.navno:content-page',
    data: { title: 'A & B', openingHours: { from: '09:00', to: '15:30' } },
    attachment: { name: 'document.pdf', binary: 'document.pdf' },
});

test('writes XP native node XML with the original id and escaped data', () => {
    const directory = mkdtempSync(join(tmpdir(), 'native-export-'));
    const nodeDirectory = join(directory, 'www.nav.no', 'page', '_');
    writeNativeNodeXml(nodeDirectory, createNode());

    const xml = readFileSync(join(nodeDirectory, 'node.xml'), 'utf8');
    assert.match(xml, /<id>content-id<\/id>/);
    assert.match(xml, /<string name="title">A &amp; B<\/string>/);
    assert.match(xml, /<localTime name="from">09:00:00\.000<\/localTime>/);
    assert.match(xml, /<localTime name="to">15:30:00\.000<\/localTime>/);
    assert.match(xml, /<binaryReference name="binary">document.pdf<\/binaryReference>/);
    assert.match(xml, /<principal key="role:system.everyone">/);
});

test('uses native index defaults when XP omits index configuration', () => {
    const directory = mkdtempSync(join(tmpdir(), 'native-export-'));
    const nodeDirectory = join(directory, 'www.nav.no', 'page', '_');
    const { _indexConfig, ...node } = createNode();

    writeNativeNodeXml(nodeDirectory, node);

    const xml = readFileSync(join(nodeDirectory, 'node.xml'), 'utf8');
    assert.match(xml, /<analyzer>document_index_default<\/analyzer>/);
    assert.match(xml, /<defaultConfig>\s*<\/defaultConfig>/);
    assert.match(xml, /<pathIndexConfigs>\s*<\/pathIndexConfigs>/);
});

test('adds the node to an existing parent manual child order', () => {
    const directory = mkdtempSync(join(tmpdir(), 'native-export-'));
    const parentSystemDirectory = join(directory, 'www.nav.no', '_');
    const nodeDirectory = join(directory, 'www.nav.no', 'page', '_');
    writeFileSync(join(directory, 'placeholder'), '');
    writeNativeNodeXml(parentSystemDirectory, { ...createNode(), _id: 'root', _name: 'www.nav.no' });
    writeFileSync(join(parentSystemDirectory, 'manualChildOrder.txt'), 'first\n');
    writeNativeNodeXml(nodeDirectory, createNode());

    assert.equal(readFileSync(join(parentSystemDirectory, 'manualChildOrder.txt'), 'utf8'), 'first\npage\n');
    assert.equal(existsSync(join(nodeDirectory, 'node.xml')), true);
});

test('writes selected children in manual order', () => {
    const directory = mkdtempSync(join(tmpdir(), 'native-export-'));
    const parent = {
        ...createNode(),
        _path: '/content/www.nav.no/menu',
        _name: 'menu',
        _childOrder: '_manualordervalue DESC, _timestamp DESC',
    };
    const first = {
        ...createNode(),
        _id: 'first',
        _path: '/content/www.nav.no/menu/first',
        _name: 'first',
        _manualOrderValue: 20,
    };
    const second = {
        ...createNode(),
        _id: 'second',
        _path: '/content/www.nav.no/menu/second',
        _name: 'second',
        _manualOrderValue: 10,
    };
    [parent, first, second].forEach((node) =>
        writeNativeNodeXml(join(directory, node._path.slice('/content/'.length), '_'), node)
    );

    writeManualChildOrders(directory, [parent, second, first]);

    assert.equal(
        readFileSync(join(directory, 'www.nav.no', 'menu', '_', 'manualChildOrder.txt'), 'utf8'),
        'first\nsecond\n'
    );
});
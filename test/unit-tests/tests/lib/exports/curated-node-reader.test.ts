import {
    getCuratedSourceBinary,
    getCuratedSourceNode,
} from '@navno-app/lib/exports/curated-node-reader';
import { getRepoConnection } from '@navno-app/lib/repos/repo-utils';
import { runInContext } from '@navno-app/lib/context/run-in-context';

jest.mock('@navno-app/lib/repos/repo-utils', () => ({ getRepoConnection: jest.fn() }));
jest.mock('@navno-app/lib/context/run-in-context', () => ({
    runInContext: jest.fn((_context, callback) => callback()),
}));

const source = {
    repository: 'com.enonic.cms.navno-engelsk',
    branch: 'draft' as const,
    contentId: 'content-id',
    versionId: 'selected-version',
};
const getNode = jest.fn();
const describe = jest.fn();
const readBinary = jest.fn();

beforeEach(() => {
    jest.mocked(getRepoConnection).mockReturnValue({ get: getNode } as never);
    getNode.mockReturnValue({
        _id: source.contentId,
        _path: '/content/www.nav.no/page',
        _versionKey: source.versionId,
    });
    describe.mockReturnValue({
        versionId: source.versionId,
        properties: [{ name: 'long', type: 'long', value: '9223372036854775807' }],
        binaryReferences: ['first.pdf', 'second.pdf'],
        manualOrderValue: '9223372036854775806',
    });
    Object.defineProperty(globalThis, '__', {
        value: {
            newBean: () => ({ describe, readBinary }),
            toNativeObject: (value: unknown) => value,
        },
        configurable: true,
        writable: true,
    });
});

afterAll(() => {
    delete (globalThis as { __?: unknown }).__;
});

test('combines exact-version metadata with typed properties without number conversion', () => {
    const result = getCuratedSourceNode(source);
    expect(getNode).toHaveBeenCalledWith({ key: source.contentId, versionId: source.versionId });
    expect(describe).toHaveBeenCalledWith(source.contentId, source.versionId);
    expect(result).toMatchObject({
        properties: [{ name: 'long', type: 'long', value: '9223372036854775807' }],
        manualOrderValue: '9223372036854775806',
        binaryReferences: ['first.pdf', 'second.pdf'],
    });
    expect(runInContext).toHaveBeenCalledWith(
        {
            repository: source.repository,
            branch: 'draft',
            asAdmin: true,
        },
        expect.any(Function)
    );
});

test('refuses node metadata from another version', () => {
    getNode.mockReturnValue({ _id: source.contentId, _versionKey: 'wrong-version' });
    expect(() => getCuratedSourceNode(source)).toThrow(/version was not found/);
    expect(describe).not.toHaveBeenCalled();
});

test('refuses mismatched typed property versions', () => {
    describe.mockReturnValue({ versionId: 'wrong-version' });
    expect(() => getCuratedSourceNode(source)).toThrow(/version changed/);
});

test('pins binary reads to the same source version', () => {
    const stream = {};
    readBinary.mockReturnValue(stream);
    expect(getCuratedSourceBinary({ ...source, binaryReference: 'second.pdf' })).toBe(stream);
    expect(readBinary).toHaveBeenCalledWith(source.contentId, source.versionId, 'second.pdf');
});

test('rejects unscoped source repositories without reading a node', () => {
    expect(() => getCuratedSourceNode({ ...source, repository: 'system-repo' })).toThrow(
        /Invalid curated source/
    );
    expect(getNode).not.toHaveBeenCalled();
});

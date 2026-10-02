import {
    CuratedTargetBatch,
    CuratedTargetExpectation,
    restoreCuratedTargetMetadata,
} from '@navno-app/lib/exports/target/curated-target-metadata';
import { userCanManageCuratedExports } from '@navno-app/lib/utils/auth-utils';
import { runInContext } from '@navno-app/lib/context/run-in-context';

jest.mock('@navno-app/lib/utils/auth-utils', () => ({ userCanManageCuratedExports: jest.fn() }));
jest.mock('@navno-app/lib/context/run-in-context', () => ({
    runInContext: jest.fn((_context, callback) => callback()),
}));

const restore = jest.fn();
const newBean = jest.fn();
const expectation = (id = 'page'): CuratedTargetExpectation => ({
    contentId: id,
    contentPath: `/content/www.nav.no/${id}`,
    versionId: 'source-version',
    childOrder: '_manualordervalue DESC',
    manualOrderValue: '9223372036854775807',
    indexConfig: { default: { enabled: true }, configs: [], allText: { languages: [] } } as never,
    nodeType: 'content',
});
const batch = (): CuratedTargetBatch => ({
    repository: 'com.enonic.cms.default',
    branch: 'draft',
    expectations: [expectation()],
});

beforeEach(() => {
    jest.mocked(userCanManageCuratedExports).mockReturnValue(true);
    app.config.env = 'localhost';
    (app.config as Record<string, unknown>).curatedImportEnabled = 'true';
    restore.mockReturnValue({ checkedNodes: 1, restoredNodes: 1 });
    newBean.mockReturnValue({ restore });
    Object.defineProperty(globalThis, '__', {
        value: { newBean, toNativeObject: (value: unknown) => value },
        configurable: true,
        writable: true,
    });
});

afterAll(() => {
    delete (globalThis as { __?: unknown }).__;
});

test('refuses non-admin callers before context elevation or bean creation', () => {
    jest.mocked(userCanManageCuratedExports).mockReturnValue(false);
    expect(() => restoreCuratedTargetMetadata(batch())).toThrow(/administrator/);
    expect(runInContext).not.toHaveBeenCalled();
    expect(newBean).not.toHaveBeenCalled();
});

test.each([
    ['prod', 'true'],
    ['localhost', undefined],
    ['localhost', true],
    ['localhost', 'false'],
])('requires trusted string opt-in with env=%s enabled=%s', (env, enabled) => {
    (app.config as Record<string, unknown>).env = env;
    (app.config as Record<string, unknown>).curatedImportEnabled = enabled;
    expect(() => restoreCuratedTargetMetadata(batch())).toThrow(/localhost opt-in/);
    expect(runInContext).not.toHaveBeenCalled();
});

test.each(['system-repo', 'com.enonic.cms.other'])(
    'rejects repository %s before elevation',
    (repository) => {
        expect(() => restoreCuratedTargetMetadata({ ...batch(), repository })).toThrow(
            /Invalid curated target batch/
        );
        expect(runInContext).not.toHaveBeenCalled();
    }
);

test('rejects empty and oversized batches', () => {
    expect(() => restoreCuratedTargetMetadata({ ...batch(), expectations: [] })).toThrow(
        /1 to 100 entries/
    );
    const oversized = Array.from({ length: 101 }, (_, index) => expectation(`page-${index}`));
    expect(() => restoreCuratedTargetMetadata({ ...batch(), expectations: oversized })).toThrow(
        /1 to 100 entries/
    );
});

test.each([
    '/content/www.nav.no/../identity',
    '/identity/system',
    '/content/www.nav.no/%2e',
    '/content/www.nav.no//page',
])('rejects non-canonical/out-of-root target %s', (contentPath) => {
    const invalid = batch();
    invalid.expectations[0].contentPath = contentPath;
    expect(() => restoreCuratedTargetMetadata(invalid)).toThrow(/metadata expectation/);
    expect(runInContext).not.toHaveBeenCalled();
});

test.each([
    { nodeType: 'system' },
    { manualOrderValue: 12 },
    { childOrder: '' },
    { properties: [] },
])('validates the entire request before any privileged work (%o)', (change) => {
    const invalid = batch();
    invalid.expectations.push({ ...expectation('second'), ...change } as never);
    expect(() => restoreCuratedTargetMetadata(invalid)).toThrow(/metadata expectation/);
    expect(runInContext).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
});

test('rejects duplicate identities and paths', () => {
    const duplicateId = batch();
    duplicateId.expectations.push({ ...expectation(), contentPath: '/content/www.nav.no/other' });
    expect(() => restoreCuratedTargetMetadata(duplicateId)).toThrow(/Duplicate/);
    const duplicatePath = batch();
    duplicatePath.expectations.push({
        ...expectation('other'),
        contentPath: '/content/www.nav.no/page',
    });
    expect(() => restoreCuratedTargetMetadata(duplicatePath)).toThrow(/Duplicate/);
});

test('passes exact 64-bit order strings to the target-only bean', () => {
    const result = restoreCuratedTargetMetadata(batch());
    const payload = JSON.parse(restore.mock.calls[0][0]);
    expect(payload.expectations[0].manualOrderValue).toBe('9223372036854775807');
    expect(newBean).toHaveBeenCalledWith('no.nav.navno.exports.target.CuratedMetadataRestore');
    expect(runInContext).toHaveBeenCalledWith(
        { repository: 'com.enonic.cms.default', branch: 'draft', asAdmin: true },
        expect.any(Function)
    );
    expect(result.restoredNodes).toBe(1);
});

test('propagates Java failures instead of claiming success', () => {
    restore.mockImplementationOnce(() => {
        throw new Error('Missing or misplaced target node');
    });
    expect(() => restoreCuratedTargetMetadata(batch())).toThrow(/misplaced target node/);
});

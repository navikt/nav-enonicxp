import {
    CuratedTargetBatch,
    CuratedTargetExpectation,
    repairCuratedTargetBatch,
    validateCuratedTargetBatch,
} from '@navno-app/lib/exports/target/curated-target-fidelity';
import { userCanManageCuratedExports } from '@navno-app/lib/utils/auth-utils';
import { runInContext } from '@navno-app/lib/context/run-in-context';

jest.mock('@navno-app/lib/utils/auth-utils', () => ({ userCanManageCuratedExports: jest.fn() }));
jest.mock('@navno-app/lib/context/run-in-context', () => ({
    runInContext: jest.fn((_context, callback) => callback()),
}));

const repair = jest.fn();
const validate = jest.fn();
const newBean = jest.fn();
const expectation = (id = 'page'): CuratedTargetExpectation => ({
    formatVersion: 2,
    contentId: id,
    contentPath: `/content/www.nav.no/${id}`,
    versionId: 'source-version',
    timestamp: '2026-09-08T00:00:00.123456789Z',
    childOrder: '_name ASC',
    manualOrderValue: '9223372036854775807',
    indexConfig: { default: { enabled: true }, configs: [], allText: { languages: [] } } as never,
    nodeType: 'content',
    properties: [{ name: 'target', type: 'reference', value: 'other-content' }],
    binaries: [],
    manualChildOrder: null,
});
const batch = (): CuratedTargetBatch => ({
    repository: 'com.enonic.cms.default',
    branch: 'draft',
    scope: 'page',
    expectations: [expectation()],
});

beforeEach(() => {
    jest.mocked(userCanManageCuratedExports).mockReturnValue(true);
    app.config.env = 'localhost';
    (app.config as Record<string, unknown>).curatedImportEnabled = 'true';
    repair.mockReturnValue({
        checkedNodes: 1,
        checkedBinaries: 0,
        checkedAbsentEntries: 0,
        repairedNodes: 1,
    });
    validate.mockReturnValue({
        checkedNodes: 1,
        checkedBinaries: 0,
        checkedAbsentEntries: 0,
        repairedNodes: 0,
    });
    newBean.mockReturnValue({ repair, validate });
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
    expect(() => repairCuratedTargetBatch(batch())).toThrow(/administrator/);
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
    expect(() => repairCuratedTargetBatch(batch())).toThrow(/localhost opt-in/);
    expect(runInContext).not.toHaveBeenCalled();
});

test.each(['system-repo', 'com.enonic.cms.other'])(
    'rejects repository %s before elevation',
    (repository) => {
        expect(() => repairCuratedTargetBatch({ ...batch(), repository })).toThrow(
            /Invalid curated target/
        );
        expect(runInContext).not.toHaveBeenCalled();
    }
);

test.each([
    '/content/www.nav.no/../identity',
    '/identity/system',
    '/content/www.nav.no/%2e',
    '/content/www.nav.no//page',
])('rejects non-canonical/out-of-root target %s', (contentPath) => {
    const invalid = batch();
    invalid.expectations[0].contentPath = contentPath;
    expect(() => repairCuratedTargetBatch(invalid)).toThrow(/canonical content path/);
    expect(runInContext).not.toHaveBeenCalled();
});

test('validates the entire request before any privileged work', () => {
    const invalid = batch();
    invalid.expectations.push({ ...expectation('second'), nodeType: 'system' } as never);
    expect(() => repairCuratedTargetBatch(invalid)).toThrow(/complete typed target/);
    expect(runInContext).not.toHaveBeenCalled();
    expect(repair).not.toHaveBeenCalled();
});

test('rejects unfinished binary sidecars', () => {
    const invalid = batch();
    invalid.expectations[0].binaries = [
        { reference: 'file.pdf', sha512: null, size: null },
    ] as never;
    expect(() => repairCuratedTargetBatch(invalid)).toThrow(/finalized binary expectation/);
    expect(runInContext).not.toHaveBeenCalled();
});

test('rejects conflicting identity/path pairs and branch membership', () => {
    const conflict = batch();
    conflict.expectations.push({
        ...expectation('second'),
        contentPath: conflict.expectations[0].contentPath,
    });
    expect(() => repairCuratedTargetBatch(conflict)).toThrow(/Conflicting target/);
    const membership = batch();
    membership.absentContentIds = ['page'];
    expect(() => validateCuratedTargetBatch(membership)).toThrow(/negative branch membership/);
    expect(runInContext).not.toHaveBeenCalled();
});

test('validates every implicitly selected manual child identity', () => {
    const invalid = batch();
    invalid.expectations[0].manualChildOrder = [
        {
            contentId: 'outside-child',
            contentPath: '/content/www.nav.no/different-parent/child',
        },
    ];
    expect(() => repairCuratedTargetBatch(invalid)).toThrow(/manual child identity/);
    expect(runInContext).not.toHaveBeenCalled();
});

test('passes exact strings and expected values to the target-only bean', () => {
    const result = repairCuratedTargetBatch(batch());
    const payload = JSON.parse(repair.mock.calls[0][0]);
    expect(payload.expectations[0].manualOrderValue).toBe('9223372036854775807');
    expect(payload.expectations[0].properties[0].type).toBe('reference');
    expect(payload.absentContentIds).toEqual([]);
    expect(newBean).toHaveBeenCalledWith('no.nav.navno.exports.target.CuratedNodeRepair');
    expect(runInContext).toHaveBeenCalledWith(
        {
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            asAdmin: true,
        },
        expect.any(Function)
    );
    expect(result.repairedNodes).toBe(1);
});

test('supports negative-only validation batches without calling the write method', () => {
    validateCuratedTargetBatch({ ...batch(), expectations: [], absentContentIds: ['draft-only'] });
    expect(JSON.parse(validate.mock.calls[0][0]).absentContentIds).toEqual(['draft-only']);
    expect(repair).not.toHaveBeenCalled();
});

test('preserves sub-millisecond temporal strings for repair and strict validation', () => {
    const input = batch();
    input.expectations[0].properties = [
        { name: 'instant', type: 'dateTime', value: '1969-12-31T23:59:59.999999999Z' },
        { name: 'local', type: 'localDateTime', value: '2024-02-29T23:59:59.123456789' },
        { name: 'time', type: 'localTime', value: '01:02:03.987654321' },
    ];
    repairCuratedTargetBatch(input);
    validateCuratedTargetBatch(input);
    expect(JSON.parse(repair.mock.calls[0][0]).expectations[0].properties).toEqual(
        input.expectations[0].properties
    );
    expect(JSON.parse(validate.mock.calls[0][0]).expectations[0].properties).toEqual(
        input.expectations[0].properties
    );
    expect(repair).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenCalledTimes(1);
});

test('propagates Java preflight/data mismatch failures instead of claiming success', () => {
    repair.mockImplementationOnce(() => {
        throw new Error('Imported typed data mismatch');
    });
    expect(() => repairCuratedTargetBatch(batch())).toThrow(/typed data mismatch/);
});

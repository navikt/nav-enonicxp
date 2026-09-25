import { NodeIndexConfig } from '/lib/xp/node';
import { userCanManageCuratedExports } from '../../utils/auth-utils';
import { runInContext } from '../../context/run-in-context';
import {
    isCuratedBranch,
    isCuratedContentId,
    isCuratedContentPath,
    isCuratedImportEnabled,
    isCuratedRepository,
} from '../curated-safety';

export type CuratedTargetExpectation = {
    contentId: string;
    contentPath: string;
    versionId?: string;
    childOrder: string;
    manualOrderValue: string | null;
    indexConfig: NodeIndexConfig;
    nodeType: 'content';
};

export type CuratedTargetBatch = {
    repository: string;
    branch: 'draft' | 'master';
    expectations: CuratedTargetExpectation[];
};

export type CuratedTargetResult = {
    checkedNodes: number;
    restoredNodes: number;
};

type RestoreBean = {
    restore: (json: string) => unknown;
};

const MAX_BATCH_SIZE = 100;

const EXPECTATION_KEYS = new Set([
    'contentId',
    'contentPath',
    'versionId',
    'childOrder',
    'manualOrderValue',
    'indexConfig',
    'nodeType',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const isValidExpectation = (expected: unknown): expected is CuratedTargetExpectation =>
    isRecord(expected) &&
    Object.keys(expected).every((key) => EXPECTATION_KEYS.has(key)) &&
    isCuratedContentId(expected.contentId) &&
    isCuratedContentPath(expected.contentPath) &&
    expected.nodeType === 'content' &&
    typeof expected.childOrder === 'string' &&
    expected.childOrder !== '' &&
    (expected.manualOrderValue === null ||
        (typeof expected.manualOrderValue === 'string' &&
            /^-?\d{1,19}$/.test(expected.manualOrderValue))) &&
    isRecord(expected.indexConfig);

const validateBatch = (batch: CuratedTargetBatch) => {
    if (
        !isRecord(batch) ||
        Object.keys(batch).some((key) => !['repository', 'branch', 'expectations'].includes(key)) ||
        !isCuratedRepository(batch.repository) ||
        !isCuratedBranch(batch.branch) ||
        !Array.isArray(batch.expectations)
    ) {
        throw new Error('Invalid curated target batch');
    }
    if (batch.expectations.length === 0 || batch.expectations.length > MAX_BATCH_SIZE) {
        throw new Error(`A target batch must contain 1 to ${MAX_BATCH_SIZE} entries`);
    }

    const ids = new Set<string>();
    const paths = new Set<string>();
    batch.expectations.forEach((expected) => {
        if (!isValidExpectation(expected)) {
            throw new Error('A complete target metadata expectation is required');
        }
        if (ids.has(expected.contentId) || paths.has(expected.contentPath)) {
            throw new Error('Duplicate target identity or path');
        }
        ids.add(expected.contentId);
        paths.add(expected.contentPath);
    });
};

export const restoreCuratedTargetMetadata = (batch: CuratedTargetBatch): CuratedTargetResult => {
    // This guard must run before any context elevation or privileged repository read.
    if (!userCanManageCuratedExports() || !isCuratedImportEnabled()) {
        throw new Error(
            'Curated target operations require an administrator and trusted localhost opt-in'
        );
    }
    validateBatch(batch);

    return runInContext(
        { repository: batch.repository, branch: batch.branch, asAdmin: true },
        () => {
            const bean = __.newBean(
                'no.nav.navno.exports.target.CuratedMetadataRestore'
            ) as RestoreBean;
            return __.toNativeObject(bean.restore(JSON.stringify(batch))) as CuratedTargetResult;
        }
    );
};

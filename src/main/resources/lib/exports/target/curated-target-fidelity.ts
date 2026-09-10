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
import { CuratedProperty } from '../curated-node-reader';

type TargetIdentity = {
    contentId: string;
    contentPath: string;
};

export type CuratedTargetExpectation = TargetIdentity & {
    formatVersion: 2;
    versionId?: string;
    timestamp?: string;
    childOrder: string;
    manualOrderValue: string | null;
    indexConfig: NodeIndexConfig;
    nodeType: 'content';
    properties: CuratedProperty[];
    binaries: Array<{ reference: string; sha512: string; size: string }>;
    manualChildOrder: TargetIdentity[] | null;
};

export type CuratedTargetBatch = {
    repository: string;
    branch: 'draft' | 'master';
    scope: 'full' | 'page';
    expectations: CuratedTargetExpectation[];
    absentContentIds?: string[];
};

export type CuratedTargetResult = {
    checkedNodes: number;
    checkedBinaries: number;
    checkedAbsentEntries: number;
    repairedNodes: number;
};

type RepairBean = {
    repair: (json: string) => unknown;
    validate: (json: string) => unknown;
};

const EXPECTATION_KEYS = new Set([
    'formatVersion',
    'contentId',
    'contentPath',
    'versionId',
    'timestamp',
    'childOrder',
    'manualOrderValue',
    'indexConfig',
    'nodeType',
    'properties',
    'binaries',
    'manualChildOrder',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const validateBatch = (batch: CuratedTargetBatch) => {
    if (
        !isRecord(batch) ||
        Object.keys(batch).some(
            (key) =>
                !['repository', 'branch', 'scope', 'expectations', 'absentContentIds'].includes(key)
        ) ||
        !isCuratedRepository(batch.repository) ||
        !isCuratedBranch(batch.branch) ||
        !['full', 'page'].includes(batch.scope) ||
        !Array.isArray(batch.expectations) ||
        (batch.absentContentIds !== undefined && !Array.isArray(batch.absentContentIds))
    ) {
        throw new Error('Invalid curated target batch');
    }
    const absent = batch.absentContentIds || [];
    if (
        batch.expectations.length + absent.length === 0 ||
        batch.expectations.length + absent.length > 100
    ) {
        throw new Error('A target batch must contain 1 to 100 explicit entries');
    }
    const identities = new Map<string, string>();
    const paths = new Map<string, string>();
    const addIdentity = (identity: TargetIdentity) => {
        if (
            !isRecord(identity) ||
            !isCuratedContentId(identity.contentId) ||
            !isCuratedContentPath(identity.contentPath)
        ) {
            throw new Error('Invalid curated target identity or canonical content path');
        }
        if (
            (identities.has(identity.contentId) &&
                identities.get(identity.contentId) !== identity.contentPath) ||
            (paths.has(identity.contentPath) &&
                paths.get(identity.contentPath) !== identity.contentId)
        ) {
            throw new Error('Conflicting target identities or paths');
        }
        identities.set(identity.contentId, identity.contentPath);
        paths.set(identity.contentPath, identity.contentId);
    };
    const explicitIds = new Set<string>();
    batch.expectations.forEach((expected) => {
        if (
            !isRecord(expected) ||
            Object.keys(expected).some((key) => !EXPECTATION_KEYS.has(key)) ||
            expected.formatVersion !== 2 ||
            expected.nodeType !== 'content' ||
            typeof expected.childOrder !== 'string' ||
            !expected.childOrder ||
            !(
                expected.manualOrderValue === null ||
                (typeof expected.manualOrderValue === 'string' &&
                    /^-?\d+$/.test(expected.manualOrderValue))
            ) ||
            !isRecord(expected.indexConfig) ||
            !Array.isArray(expected.properties) ||
            !Array.isArray(expected.binaries) ||
            !(expected.manualChildOrder === null || Array.isArray(expected.manualChildOrder))
        ) {
            throw new Error('A complete typed target expectation (formatVersion 2) is required');
        }
        addIdentity(expected);
        if (explicitIds.has(expected.contentId)) {
            throw new Error('Duplicate target expectation');
        }
        explicitIds.add(expected.contentId);
        expected.binaries.forEach((binary) => {
            if (
                !isRecord(binary) ||
                Object.keys(binary).some((key) => !['reference', 'sha512', 'size'].includes(key)) ||
                typeof binary.reference !== 'string' ||
                !binary.reference ||
                typeof binary.sha512 !== 'string' ||
                !/^[a-f0-9]{128}$/.test(binary.sha512) ||
                typeof binary.size !== 'string' ||
                !/^(0|[1-9]\d*)$/.test(binary.size)
            ) {
                throw new Error('Missing or invalid finalized binary expectation');
            }
        });
        if (expected.manualChildOrder && expected.manualChildOrder.length > 20000) {
            throw new Error('Manual child order exceeds the curated entry limit');
        }
        const childIds = new Set<string>();
        expected.manualChildOrder?.forEach((child) => {
            addIdentity(child);
            if (
                Object.keys(child).some((key) => !['contentId', 'contentPath'].includes(key)) ||
                child.contentPath.slice(0, child.contentPath.lastIndexOf('/')) !==
                    expected.contentPath ||
                childIds.has(child.contentId)
            ) {
                throw new Error('Invalid selected manual child identity');
            }
            childIds.add(child.contentId);
        });
    });
    const absentIds = new Set<string>();
    absent.forEach((id) => {
        if (!isCuratedContentId(id) || identities.has(id) || absentIds.has(id)) {
            throw new Error('Conflicting or invalid negative branch membership');
        }
        absentIds.add(id);
    });
};

const execute = (batch: CuratedTargetBatch, action: 'repair' | 'validate'): CuratedTargetResult => {
    // This guard must run before any context elevation or privileged repository read.
    if (!userCanManageCuratedExports() || !isCuratedImportEnabled()) {
        throw new Error(
            'Curated target operations require an administrator and trusted localhost opt-in'
        );
    }
    validateBatch(batch);
    const json = JSON.stringify({ ...batch, absentContentIds: batch.absentContentIds || [] });
    return runInContext(
        { repository: batch.repository, branch: batch.branch, asAdmin: true },
        () => {
            const bean = __.newBean('no.nav.navno.exports.target.CuratedNodeRepair') as RepairBean;
            return __.toNativeObject(bean[action](json)) as CuratedTargetResult;
        }
    );
};

export const repairCuratedTargetBatch = (batch: CuratedTargetBatch) => execute(batch, 'repair');
export const validateCuratedTargetBatch = (batch: CuratedTargetBatch) => execute(batch, 'validate');

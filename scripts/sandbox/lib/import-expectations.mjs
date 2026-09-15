import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPOSITORIES = [
    'com.enonic.cms.default',
    'com.enonic.cms.navno-engelsk',
    'com.enonic.cms.navno-nynorsk',
];

export const loadCuratedExpectations = (manifest, files) => {
    const groups = [];
    for (const repository of REPOSITORIES) {
        for (const branch of ['draft', 'master']) {
            const entries = manifest.entries.filter(
                (entry) => entry.repoId === repository && entry.branches.includes(branch)
            );
            const absentContentIds = manifest.entries
                .filter((entry) => entry.repoId === repository && !entry.branches.includes(branch))
                .map(({ contentId }) => contentId);
            const nativeExport = manifest.exports.find(
                (entry) => entry.repoId === repository && entry.sourceBranch === branch
            );
            if (Boolean(nativeExport) !== entries.length > 0) {
                throw new Error(`Manifest/export membership differs for ${repository}:${branch}`);
            }
            const paths = new Map(entries.map((entry) => [entry.contentId, entry.paths[branch]]));
            const nodeFiles = new Set(
                entries.map(
                    (entry) => `${entry.paths[branch].slice('/content/'.length)}/_/node.xml`
                )
            );
            if (nativeExport) {
                const actualFiles = files.filesByExport
                    .get(nativeExport.exportName)
                    .filter((path) => path === '_/node.xml' || path.endsWith('/_/node.xml'));
                if (
                    actualFiles.length !== nodeFiles.size ||
                    actualFiles.some((path) => !nodeFiles.has(path))
                ) {
                    throw new Error(
                        `Native export contains missing or unselected nodes: ${nativeExport.exportName}`
                    );
                }
            }
            const expectations = entries.map((entry) => {
                const path = join(
                    files.sourceDirectory,
                    nativeExport.exportName,
                    entry.paths[branch].slice('/content/'.length),
                    '_/curated-metadata.json'
                );
                const expected = JSON.parse(readFileSync(path, 'utf8'));
                if (
                    expected.formatVersion !== 2 ||
                    expected.contentId !== entry.contentId ||
                    expected.contentPath !== entry.paths[branch] ||
                    expected.versionId !== entry.versions[branch] ||
                    expected.nodeType !== 'content' ||
                    typeof expected.childOrder !== 'string' ||
                    !expected.childOrder ||
                    !(
                        expected.manualOrderValue === null ||
                        (typeof expected.manualOrderValue === 'string' &&
                            /^-?\d+$/.test(expected.manualOrderValue))
                    ) ||
                    !expected.indexConfig ||
                    typeof expected.indexConfig !== 'object' ||
                    Array.isArray(expected.indexConfig) ||
                    !Array.isArray(expected.properties) ||
                    !Array.isArray(expected.binaries) ||
                    expected.binaries.some(
                        ({ reference, sha512, size }) =>
                            typeof reference !== 'string' ||
                            !reference ||
                            typeof sha512 !== 'string' ||
                            !/^[a-f0-9]{128}$/.test(sha512) ||
                            typeof size !== 'string' ||
                            !/^(0|[1-9]\d*)$/.test(size)
                    ) ||
                    !(
                        expected.manualChildOrder === null ||
                        Array.isArray(expected.manualChildOrder)
                    ) ||
                    expected.manualChildOrder?.some(
                        (child) =>
                            paths.get(child.contentId) !== child.contentPath ||
                            child.contentPath.slice(0, child.contentPath.lastIndexOf('/')) !==
                                expected.contentPath
                    )
                ) {
                    throw new Error(
                        `Missing, stale or incomplete typed expectation for ${entry.contentId}`
                    );
                }
                return expected;
            });
            if (expectations.length || absentContentIds.length) {
                groups.push({
                    repository,
                    branch,
                    scope: manifest.scope ?? 'full',
                    expectations,
                    absentContentIds,
                });
            }
        }
    }
    return groups;
};

export const batchCuratedExpectations = (group, size = 50) => {
    if (!Number.isInteger(size) || size < 1 || size > 100) {
        throw new Error('Fidelity batch size must be between 1 and 100');
    }
    const batches = [];
    for (let start = 0; start < group.expectations.length; start += size) {
        batches.push({
            ...group,
            expectations: group.expectations.slice(start, start + size),
            absentContentIds: [],
        });
    }
    for (let start = 0; start < group.absentContentIds.length; start += size) {
        batches.push({
            ...group,
            expectations: [],
            absentContentIds: group.absentContentIds.slice(start, start + size),
        });
    }
    return batches;
};

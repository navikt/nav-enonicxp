import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPOSITORIES = [
    'com.enonic.cms.default',
    'com.enonic.cms.navno-engelsk',
    'com.enonic.cms.navno-nynorsk',
];

const isValidExpectation = (expected, entry, branch) =>
    expected.contentId === entry.contentId &&
    expected.contentPath === entry.paths[branch] &&
    expected.versionId === entry.versions[branch] &&
    expected.nodeType === 'content' &&
    typeof expected.childOrder === 'string' &&
    expected.childOrder !== '' &&
    (expected.manualOrderValue === null ||
        (typeof expected.manualOrderValue === 'string' &&
            /^-?\d{1,19}$/.test(expected.manualOrderValue))) &&
    Boolean(expected.indexConfig) &&
    typeof expected.indexConfig === 'object' &&
    !Array.isArray(expected.indexConfig);

const assertExportMatchesSelection = (nativeExport, entries, branch, files) => {
    const selectedFiles = new Set(
        entries.map((entry) => `${entry.paths[branch].slice('/content/'.length)}/_/node.xml`)
    );
    const actualFiles = files.filesByExport
        .get(nativeExport.exportName)
        .filter((path) => path === '_/node.xml' || path.endsWith('/_/node.xml'));
    if (
        actualFiles.length !== selectedFiles.size ||
        actualFiles.some((path) => !selectedFiles.has(path))
    ) {
        throw new Error(
            `Native export contains missing or unselected nodes: ${nativeExport.exportName}`
        );
    }
};

export const loadCuratedExpectations = (manifest, files) => {
    const groups = [];
    for (const repository of REPOSITORIES) {
        for (const branch of ['draft', 'master']) {
            const entries = manifest.entries.filter(
                (entry) => entry.repoId === repository && entry.branches.includes(branch)
            );
            const nativeExport = manifest.exports.find(
                (entry) => entry.repoId === repository && entry.sourceBranch === branch
            );
            if (Boolean(nativeExport) !== entries.length > 0) {
                throw new Error(`Manifest/export membership differs for ${repository}:${branch}`);
            }
            if (!nativeExport) {
                continue;
            }
            assertExportMatchesSelection(nativeExport, entries, branch, files);
            const expectations = entries.map((entry) => {
                const path = join(
                    files.sourceDirectory,
                    nativeExport.exportName,
                    entry.paths[branch].slice('/content/'.length),
                    '_/curated-metadata.json'
                );
                const expected = JSON.parse(readFileSync(path, 'utf8'));
                if (!isValidExpectation(expected, entry, branch)) {
                    throw new Error(
                        `Missing, stale or incomplete metadata expectation for ${entry.contentId}`
                    );
                }
                return expected;
            });
            groups.push({ repository, branch, expectations });
        }
    }
    return groups;
};

export const batchCuratedExpectations = (group, size = 50) => {
    if (!Number.isInteger(size) || size < 1 || size > 100) {
        throw new Error('Metadata batch size must be between 1 and 100');
    }
    const batches = [];
    for (let start = 0; start < group.expectations.length; start += size) {
        batches.push({ ...group, expectations: group.expectations.slice(start, start + size) });
    }
    return batches;
};

const mockNodes = new Map<string, Record<string, unknown>>();

const fakeRepo = {
    exists: jest.fn((path: string) => mockNodes.has(path)),
    create: jest.fn((node: { _parentPath: string; _name: string }) => {
        const path = `${node._parentPath === '/' ? '' : node._parentPath}/${node._name}`;
        mockNodes.set(path, node);
        return node;
    }),
    modify: jest.fn(
        ({ key, editor }: { key: string; editor: (node: Record<string, unknown>) => unknown }) => {
            const updated = editor(mockNodes.get(key) as Record<string, unknown>);
            mockNodes.set(key, updated as Record<string, unknown>);
            return updated;
        }
    ),
    get: jest.fn((path: string) => mockNodes.get(path) ?? null),
    refresh: jest.fn(),
};

jest.mock('@navno-app/lib/repos/misc-repo', () => ({
    getMiscRepoConnection: () => fakeRepo,
}));

import { getJobResult, runJobWithResult } from '@navno-app/lib/jobs/job-results';

describe('Webapp job results', () => {
    beforeEach(() => {
        mockNodes.clear();
    });

    test('stores the callback result as the summary of a finished job', () => {
        runJobWithResult({
            jobName: 'backfill',
            startedBy: 'ola',
            callback: () => ({ 'com.enonic.cms.navno-nynorsk': { updated: 2, failed: 0 } }),
        });

        expect(getJobResult('backfill')).toEqual({
            status: 'ok',
            startedAt: expect.any(String),
            finishedAt: expect.any(String),
            startedBy: 'ola',
            summary: '{"com.enonic.cms.navno-nynorsk":{"updated":2,"failed":0}}',
        });
    });

    test('stores the job as running while the callback runs', () => {
        let resultWhileRunning;

        runJobWithResult({
            jobName: 'norg',
            startedBy: 'ola',
            callback: () => {
                resultWhileRunning = getJobResult('norg');
            },
        });

        expect(resultWhileRunning).toMatchObject({ status: 'running', startedBy: 'ola' });
        expect(getJobResult('norg')).not.toHaveProperty('summary');
    });

    test('stores the error of a failed job and rethrows it', () => {
        expect(() =>
            runJobWithResult({
                jobName: 'norg',
                startedBy: 'ola',
                callback: () => {
                    throw new Error('Norg svarte ikke');
                },
            })
        ).toThrow('Norg svarte ikke');

        expect(getJobResult('norg')).toMatchObject({
            status: 'failed',
            summary: 'Error: Norg svarte ikke',
        });
    });

    test('replaces the result of the previous run', () => {
        runJobWithResult({ jobName: 'norg', startedBy: 'ola', callback: () => 'første' });
        runJobWithResult({ jobName: 'norg', startedBy: 'kari', callback: () => 'andre' });

        expect(getJobResult('norg')).toMatchObject({ startedBy: 'kari', summary: 'andre' });
    });
});

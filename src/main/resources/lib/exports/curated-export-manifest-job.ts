import * as authLib from '/lib/xp/auth';
import * as contextLib from '/lib/xp/context';
import * as taskLib from '/lib/xp/task';
import { Request, Response } from '@enonic-types/core';
import { logger } from '../utils/logging';
import { createCuratedExportManifest } from './curated-export-manifest';
import { curatedJsonResponse as jsonResponse } from './curated-safety';
import {
    createRandomHex,
    deleteExpiredCuratedNodes,
    getCuratedStoreRepo,
} from './curated-export-store';
import {
    ManifestRequest,
    parseManifestRequest,
} from '../../services/curatedExportManifest/curatedExportManifest';

// Building a full manifest takes longer than the proxy in front of deployed XP allows for one
// request. The token route therefore builds it as a task: POST starts a job and the CLI polls
// GET ?job=<id>. The result is stored in the misc repo, as the poll may hit another cluster node.

const JOB_ROOT_NAME = 'curated-export-manifest-jobs';
const JOB_ROOT_PATH = `/${JOB_ROOT_NAME}`;
const JOB_LIFETIME_MS = 30 * 60 * 1000;
const JOB_ID = /^[0-9a-f]{64}$/;

type JobResult = { status: 'done'; manifest: string } | { status: 'failed'; message: string };

type ManifestJobNode = {
    userKey: string;
    expiresAtMs: number;
} & ({ status: 'running' } | JobResult);

const buildManifest = (
    user: { idProvider: string; login: string },
    { paths, scope, seeds, includeDrafts }: ManifestRequest
): JobResult => {
    try {
        const manifest = contextLib.run({ user }, () =>
            createCuratedExportManifest(paths, scope, { seeds, includeDrafts })
        );
        return { status: 'done', manifest: JSON.stringify(manifest) };
    } catch (error) {
        logger.error(`Failed to create curated content export manifest: ${error}`);
        return { status: 'failed', message: `Failed to create export manifest: ${error}` };
    }
};

const finishJob = (jobId: string, result: JobResult) => {
    try {
        const repo = getCuratedStoreRepo(JOB_ROOT_NAME);
        repo.modify({
            key: `${JOB_ROOT_PATH}/${jobId}`,
            editor: (node) => ({ ...node, ...result }),
        });
        repo.refresh();
    } catch (error) {
        // The job may have expired and been cleaned up while the manifest was being built.
        logger.warning(`Failed to store curated export manifest job result: ${error}`);
    }
};

export const startManifestJob = (req: Request): Response => {
    const parsed = parseManifestRequest(req);
    if ('error' in parsed) {
        return parsed.error;
    }
    const user = authLib.getUser();
    if (!user) {
        return jsonResponse(401, { message: 'A valid curated export token is required' });
    }

    const jobId = createRandomHex();
    const repo = getCuratedStoreRepo(JOB_ROOT_NAME);
    deleteExpiredCuratedNodes(repo, JOB_ROOT_NAME);
    repo.create({
        _parentPath: JOB_ROOT_PATH,
        _name: jobId,
        // The manifest can be large, and is only ever read back whole.
        _indexConfig: {
            default: 'byType',
            configs: [
                { path: 'manifest', config: 'none' },
                { path: 'message', config: 'none' },
            ],
        },
        userKey: user.key,
        status: 'running',
        expiresAtMs: Date.now() + JOB_LIFETIME_MS,
    });
    repo.refresh();

    const taskUser = { idProvider: user.idProvider, login: user.login };
    const { request } = parsed;
    taskLib.executeFunction({
        description: 'Create curated export manifest',
        func: () => finishJob(jobId, buildManifest(taskUser, request)),
    });
    return jsonResponse(202, { job: jobId });
};

export const getManifestJob = (req: Request): Response => {
    const jobId = req.params.job;
    if (typeof jobId !== 'string' || !JOB_ID.test(jobId)) {
        return jsonResponse(400, { message: 'A "job" parameter is required' });
    }
    const repo = getCuratedStoreRepo(JOB_ROOT_NAME);
    const node = repo.get<ManifestJobNode>(`${JOB_ROOT_PATH}/${jobId}`);
    // Jobs are only visible to the user who started them.
    if (!node || node.userKey !== authLib.getUser()?.key || node.expiresAtMs <= Date.now()) {
        return jsonResponse(404, { message: 'Unknown or expired manifest job' });
    }
    if (node.status === 'running') {
        return jsonResponse(202, { status: 'running' });
    }

    repo.delete(node._id);
    if (node.status === 'failed') {
        return jsonResponse(500, { message: node.message });
    }
    return {
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: node.manifest,
    };
};

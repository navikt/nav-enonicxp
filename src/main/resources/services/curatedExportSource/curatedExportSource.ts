import { Request, Response } from '@enonic-types/core';
import {
    getCuratedSourceBinary,
    getCuratedSourceNode,
} from '../../lib/exports/curated-node-reader';
import { userCanManageCuratedExports } from '../../lib/utils/auth-utils';
import { logger } from '../../lib/utils/logging';
import {
    isCuratedBranch,
    isCuratedContentId,
    isCuratedContentPath,
    isCuratedRepository,
} from '../../lib/exports/curated-safety';
const MAX_BATCH_SIZE = 100;

const jsonResponse = (status: number, body: Record<string, unknown>): Response => ({
    status,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'no-store' },
    body,
});

const getStringParam = (req: Request, name: string) => {
    const value = req.params[name];
    return typeof value === 'string' ? value : null;
};

const getRequest = (req: Request) => {
    const repository = getStringParam(req, 'repository');
    const branch = getStringParam(req, 'branch');
    const contentId = getStringParam(req, 'contentId');
    const versionId = req.params.versionId;
    if (
        !isCuratedRepository(repository) ||
        !isCuratedBranch(branch) ||
        !isCuratedContentId(contentId) ||
        (versionId !== undefined && !isCuratedContentId(versionId))
    ) {
        return null;
    }

    return {
        repository,
        branch,
        contentId,
        ...(versionId !== undefined && { versionId: versionId as string }),
    };
};

const getRepositoryAndBranch = (repository: unknown, branch: unknown) => {
    if (!isCuratedRepository(repository) || !isCuratedBranch(branch)) {
        return null;
    }
    return { repository, branch };
};

export const get = (req: Request): Response => {
    if (!userCanManageCuratedExports()) {
        return jsonResponse(403, { message: 'System administrator access is required' });
    }
    const request = getRequest(req);
    if (!request) {
        return jsonResponse(400, {
            message: 'Invalid repository, branch, contentId, or versionId',
        });
    }
    const binaryReference = getStringParam(req, 'binaryReference');
    if (req.params.binaryReference !== undefined && (!binaryReference || !request.versionId)) {
        return jsonResponse(400, {
            message: 'Binary reads require a binaryReference and an explicit versionId',
        });
    }

    try {
        const source = getCuratedSourceNode(request);
        const node = source.node;
        if (!node || !isCuratedContentPath(node._path)) {
            return jsonResponse(404, { message: 'Selected content node was not found' });
        }
        if (
            node._id !== request.contentId ||
            (request.versionId !== undefined && node._versionKey !== request.versionId)
        ) {
            return jsonResponse(409, { message: 'Selected content ID or version did not match' });
        }

        if (!binaryReference) {
            return jsonResponse(200, source);
        }
        if (!source.binaryReferences.includes(binaryReference)) {
            return jsonResponse(404, { message: 'Binary reference was not found on the node' });
        }

        const binary = getCuratedSourceBinary({
            ...request,
            versionId: request.versionId!,
            binaryReference,
        });
        if (!binary) {
            return jsonResponse(404, { message: 'Binary data was not found' });
        }
        return {
            status: 200,
            contentType: 'application/octet-stream',
            headers: { 'Cache-Control': 'no-store' },
            body: binary,
        };
    } catch (error) {
        logger.error(
            `Curated export source failed for ${request.repository}:${request.branch}:${request.contentId}: ${error}`
        );
        return jsonResponse(500, { message: 'Failed to read curated export source data' });
    }
};

export const post = (req: Request): Response => {
    if (!userCanManageCuratedExports()) {
        return jsonResponse(403, { message: 'System administrator access is required' });
    }
    if (!req.body) {
        return jsonResponse(400, { message: 'A JSON request body is required' });
    }

    try {
        const body = JSON.parse(req.body) as {
            repository?: unknown;
            branch?: unknown;
            contentIds?: unknown;
            versionIds?: unknown;
        };
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return jsonResponse(400, { message: 'A JSON object is required' });
        }
        const source = getRepositoryAndBranch(body.repository, body.branch);
        if (
            !source ||
            !Array.isArray(body.contentIds) ||
            body.contentIds.length === 0 ||
            body.contentIds.length > MAX_BATCH_SIZE ||
            body.contentIds.some((contentId) => !isCuratedContentId(contentId)) ||
            !Array.isArray(body.versionIds) ||
            body.versionIds.length !== body.contentIds.length ||
            body.versionIds.some((versionId) => !isCuratedContentId(versionId))
        ) {
            return jsonResponse(400, {
                message: 'Invalid repository, branch, contentIds, or parallel versionIds',
            });
        }

        const versionIds = body.versionIds as string[];
        const nodes = body.contentIds.map((contentId, index) => {
            const versionId = versionIds[index];
            const envelope = getCuratedSourceNode({ ...source, contentId, versionId });
            const node = envelope.node;
            if (!node || !isCuratedContentPath(node._path)) {
                throw new Error(`Selected content node was not found: ${contentId}`);
            }
            if (node._id !== contentId || node._versionKey !== versionId) {
                throw new Error(`Selected content ID or version did not match: ${contentId}`);
            }
            return envelope;
        });
        return jsonResponse(200, { nodes });
    } catch (error) {
        logger.error(`Curated export source batch failed: ${error}`);
        return jsonResponse(500, { message: 'Failed to read curated export source batch' });
    }
};

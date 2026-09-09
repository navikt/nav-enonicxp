import { Request, Response } from '@enonic-types/core';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { getRepoConnection } from '../../lib/repos/repo-utils';
import { userCanManageCuratedExports } from '../../lib/utils/auth-utils';
import { logger } from '../../lib/utils/logging';

const ALLOWED_REPOSITORIES = [
    'com.enonic.cms.default',
    'com.enonic.cms.navno-engelsk',
    'com.enonic.cms.navno-nynorsk',
];
const ALLOWED_BRANCHES = ['draft', 'master'];
const MAX_BATCH_SIZE = 100;

const jsonResponse = (status: number, body: Record<string, unknown>): Response => ({
    status,
    contentType: 'application/json',
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
    if (
        !repository ||
        !ALLOWED_REPOSITORIES.includes(repository) ||
        !branch ||
        !ALLOWED_BRANCHES.includes(branch) ||
        !contentId ||
        !/^[a-zA-Z0-9-]+$/.test(contentId)
    ) {
        return null;
    }

    return { repository, branch, contentId };
};

const getRepositoryAndBranch = (repository: unknown, branch: unknown) => {
    if (
        typeof repository !== 'string' ||
        !ALLOWED_REPOSITORIES.includes(repository) ||
        typeof branch !== 'string' ||
        !ALLOWED_BRANCHES.includes(branch)
    ) {
        return null;
    }
    return { repository, branch };
};

const getBinaryReferences = (node: RepoNode<Content>) => {
    const references: string[] = [];
    if (node.attachment?.binary) {
        references.push(node.attachment.binary);
    }
    Object.keys(node.attachments || {}).forEach((name) => {
        const attachment = node.attachments?.[name] as { binary?: string } | undefined;
        if (attachment?.binary) {
            references.push(attachment.binary);
        }
    });
    return references;
};

export const get = (req: Request): Response => {
    if (!userCanManageCuratedExports()) {
        return jsonResponse(403, { message: 'System administrator access is required' });
    }
    const request = getRequest(req);
    if (!request) {
        return jsonResponse(400, { message: 'Invalid repository, branch, or contentId' });
    }

    try {
        const connection = getRepoConnection({
            repoId: request.repository,
            branch: request.branch,
            asAdmin: true,
        });
        const node = connection.get<Content>(request.contentId);
        if (!node || !node._path.startsWith('/content/www.nav.no')) {
            return jsonResponse(404, { message: 'Selected content node was not found' });
        }

        const binaryReference = getStringParam(req, 'binaryReference');
        if (!binaryReference) {
            return jsonResponse(200, { node, binaryReferences: getBinaryReferences(node) });
        }
        if (!getBinaryReferences(node).includes(binaryReference)) {
            return jsonResponse(404, { message: 'Binary reference was not found on the node' });
        }

        const binary = connection.getBinary({ key: request.contentId, binaryReference });
        if (!binary) {
            return jsonResponse(404, { message: 'Binary data was not found' });
        }
        return {
            status: 200,
            contentType: 'application/octet-stream',
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
        };
        const source = getRepositoryAndBranch(body.repository, body.branch);
        if (
            !source ||
            !Array.isArray(body.contentIds) ||
            body.contentIds.length === 0 ||
            body.contentIds.length > MAX_BATCH_SIZE ||
            body.contentIds.some(
                (contentId) => typeof contentId !== 'string' || !/^[a-zA-Z0-9-]+$/.test(contentId)
            )
        ) {
            return jsonResponse(400, { message: 'Invalid repository, branch, or contentIds' });
        }

        const connection = getRepoConnection({
            repoId: source.repository,
            branch: source.branch,
            asAdmin: true,
        });
        const nodes = body.contentIds.map((contentId) => {
            const node = connection.get<Content>(contentId);
            if (!node || !node._path.startsWith('/content/www.nav.no')) {
                throw new Error(`Selected content node was not found: ${contentId}`);
            }
            return { node, binaryReferences: getBinaryReferences(node) };
        });
        return jsonResponse(200, { nodes });
    } catch (error) {
        logger.error(`Curated export source batch failed: ${error}`);
        return jsonResponse(500, { message: 'Failed to read curated export source batch' });
    }
};
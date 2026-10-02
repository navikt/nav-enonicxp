import { Request, Response } from '@enonic-types/core';
import {
    createCuratedExportManifest,
    CuratedExportSeed,
} from '../../lib/exports/curated-export-manifest';
import {
    curatedJsonResponse as jsonResponse,
    isCuratedBranch,
    isCuratedContentId,
    isCuratedRepository,
    isJsonRequest,
    isRecord,
} from '../../lib/exports/curated-safety';
import { userCanManageCuratedExports } from '../../lib/utils/auth-utils';
import { logger } from '../../lib/utils/logging';

type RequestBody = {
    paths?: unknown;
    scope?: unknown;
    seeds?: unknown;
    includeDrafts?: unknown;
};

const isSeed = (value: unknown): value is CuratedExportSeed => {
    return (
        isRecord(value) &&
        isCuratedRepository(value.repository) &&
        isCuratedBranch(value.branch) &&
        isCuratedContentId(value.contentId)
    );
};

export type ManifestRequest = {
    paths: string[];
    scope: 'full' | 'page';
    seeds: CuratedExportSeed[];
    includeDrafts: boolean;
};

type ParsedManifestRequest = { request: ManifestRequest } | { error: Response };

// Validates the request body; shared with the token route, which builds manifests as tasks.
export const parseManifestRequest = (req: Request): ParsedManifestRequest => {
    if (!isJsonRequest(req)) {
        return { error: jsonResponse(415, { message: 'Content-Type must be application/json' }) };
    }
    if (!req.body) {
        return {
            error: jsonResponse(400, {
                message: 'A JSON body with a "paths" or "seeds" array is required',
            }),
        };
    }

    let body: RequestBody;
    try {
        body = JSON.parse(req.body) as RequestBody;
    } catch {
        return { error: jsonResponse(400, { message: 'Invalid JSON' }) };
    }
    if (!isRecord(body) || (body.paths === undefined && body.seeds === undefined)) {
        return { error: jsonResponse(400, { message: 'A "paths" or "seeds" array is required' }) };
    }
    const { paths = [], seeds = [], scope = 'full', includeDrafts = false } = body;
    if (!Array.isArray(paths) || paths.some((path) => typeof path !== 'string')) {
        return { error: jsonResponse(400, { message: '"paths" must be an array of strings' }) };
    }
    if (scope !== 'full' && scope !== 'page') {
        return { error: jsonResponse(400, { message: '"scope" must be "full" or "page"' }) };
    }
    if (typeof includeDrafts !== 'boolean') {
        return { error: jsonResponse(400, { message: '"includeDrafts" must be a boolean' }) };
    }
    if (!Array.isArray(seeds) || !seeds.every(isSeed)) {
        return {
            error: jsonResponse(400, {
                message: '"seeds" must contain valid curated content tuples',
            }),
        };
    }
    return { request: { paths, scope, seeds, includeDrafts } };
};

export const post = (req: Request) => {
    if (!userCanManageCuratedExports()) {
        return jsonResponse(403, { message: 'System administrator access is required' });
    }
    const parsed = parseManifestRequest(req);
    if ('error' in parsed) {
        return parsed.error;
    }

    const { paths, scope, seeds, includeDrafts } = parsed.request;
    try {
        return jsonResponse(
            200,
            createCuratedExportManifest(paths, scope, { seeds, includeDrafts })
        );
    } catch (error) {
        logger.error(`Failed to create curated content export manifest: ${error}`);
        return jsonResponse(500, { message: `Failed to create export manifest: ${error}` });
    }
};

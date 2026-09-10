import { Request } from '@enonic-types/core';
import {
    createCuratedExportManifest,
    CuratedExportSeed,
} from '../../lib/exports/curated-content-export';
import {
    isCuratedBranch,
    isCuratedContentId,
    isCuratedRepository,
} from '../../lib/exports/curated-safety';
import { userCanManageCuratedExports } from '../../lib/utils/auth-utils';
import { logger } from '../../lib/utils/logging';

type RequestBody = {
    paths?: unknown;
    scope?: unknown;
    seeds?: unknown;
};

const jsonResponse = (status: number, body: Record<string, unknown>) => ({
    status,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'no-store' },
    body,
});

const isSeed = (value: unknown): value is CuratedExportSeed => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const seed = value as Record<string, unknown>;
    return (
        isCuratedRepository(seed.repository) &&
        isCuratedBranch(seed.branch) &&
        isCuratedContentId(seed.contentId)
    );
};

export const post = (req: Request) => {
    if (!userCanManageCuratedExports()) {
        return jsonResponse(403, { message: 'System administrator access is required' });
    }
    if (!req.body) {
        return jsonResponse(400, {
            message: 'A JSON body with a "paths" or "seeds" array is required',
        });
    }

    try {
        const body = JSON.parse(req.body) as RequestBody;
        if (
            !body ||
            typeof body !== 'object' ||
            Array.isArray(body) ||
            (body.paths === undefined && body.seeds === undefined)
        ) {
            return jsonResponse(400, { message: 'A "paths" or "seeds" array is required' });
        }
        const { paths = [], seeds = [], scope = 'full' } = body;
        if (!Array.isArray(paths) || paths.some((path) => typeof path !== 'string')) {
            return jsonResponse(400, { message: '"paths" must be an array of strings' });
        }
        if (scope !== 'full' && scope !== 'page') {
            return jsonResponse(400, { message: '"scope" must be "full" or "page"' });
        }
        if (!Array.isArray(seeds) || !seeds.every(isSeed)) {
            return jsonResponse(400, {
                message: '"seeds" must contain valid curated content tuples',
            });
        }

        return jsonResponse(200, createCuratedExportManifest(paths, scope, { seeds }));
    } catch (error) {
        logger.error(`Failed to create curated content export manifest: ${error}`);
        return jsonResponse(500, { message: `Failed to create export manifest: ${error}` });
    }
};

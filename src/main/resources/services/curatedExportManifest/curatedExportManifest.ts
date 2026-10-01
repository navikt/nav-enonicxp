import { Request } from '@enonic-types/core';
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

export const post = (req: Request) => {
    if (!userCanManageCuratedExports()) {
        return jsonResponse(403, { message: 'System administrator access is required' });
    }
    if (!isJsonRequest(req)) {
        return jsonResponse(415, { message: 'Content-Type must be application/json' });
    }
    if (!req.body) {
        return jsonResponse(400, {
            message: 'A JSON body with a "paths" or "seeds" array is required',
        });
    }

    try {
        const body = JSON.parse(req.body) as RequestBody;
        if (!isRecord(body) || (body.paths === undefined && body.seeds === undefined)) {
            return jsonResponse(400, { message: 'A "paths" or "seeds" array is required' });
        }
        const { paths = [], seeds = [], scope = 'full', includeDrafts = false } = body;
        if (!Array.isArray(paths) || paths.some((path) => typeof path !== 'string')) {
            return jsonResponse(400, { message: '"paths" must be an array of strings' });
        }
        if (scope !== 'full' && scope !== 'page') {
            return jsonResponse(400, { message: '"scope" must be "full" or "page"' });
        }
        if (typeof includeDrafts !== 'boolean') {
            return jsonResponse(400, { message: '"includeDrafts" must be a boolean' });
        }
        if (!Array.isArray(seeds) || !seeds.every(isSeed)) {
            return jsonResponse(400, {
                message: '"seeds" must contain valid curated content tuples',
            });
        }

        return jsonResponse(
            200,
            createCuratedExportManifest(paths, scope, { seeds, includeDrafts })
        );
    } catch (error) {
        logger.error(`Failed to create curated content export manifest: ${error}`);
        return jsonResponse(500, { message: `Failed to create export manifest: ${error}` });
    }
};

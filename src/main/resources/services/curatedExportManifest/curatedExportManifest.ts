import { Request } from '@enonic-types/core';
import { createCuratedExportManifest } from '../../lib/exports/curated-content-export';
import { userCanManageCuratedExports } from '../../lib/utils/auth-utils';
import { logger } from '../../lib/utils/logging';

type RequestBody = {
    paths?: unknown;
    scope?: unknown;
};

const jsonResponse = (status: number, body: Record<string, unknown>) => ({
    status,
    contentType: 'application/json',
    body,
});

export const post = (req: Request) => {
    if (!userCanManageCuratedExports()) {
        return jsonResponse(403, { message: 'System administrator access is required' });
    }
    if (!req.body) {
        return jsonResponse(400, { message: 'A JSON body with a "paths" array is required' });
    }

    try {
        const { paths, scope = 'full' } = JSON.parse(req.body) as RequestBody;
        if (!Array.isArray(paths) || paths.some((path) => typeof path !== 'string')) {
            return jsonResponse(400, { message: '"paths" must be an array of strings' });
        }
        if (scope !== 'full' && scope !== 'page') {
            return jsonResponse(400, { message: '"scope" must be "full" or "page"' });
        }

        return jsonResponse(200, createCuratedExportManifest(paths, scope));
    } catch (error) {
        logger.error(`Failed to create curated content export manifest: ${error}`);
        return jsonResponse(500, { message: `Failed to create export manifest: ${error}` });
    }
};
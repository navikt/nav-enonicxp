import { runQuery } from '../../../services/dataQuery/utils/queryRunners';
import { logger } from '../../../lib/utils/logging';

export const externalArchiveSearchService = (req: XP.Request) => {
    try {
        const { query } = req.params;
        const requestId: string = `archive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const result = runQuery({
            requestId,
            query: query || '_path LIKE "/archive/*"',
            branch: 'archived',
            batch: 0,
            // types: ['base:folder'], // adjust types as needed
        });

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                query,
                total: result.total,
                hits: result.hits,
                hasMore: result.hasMore,
            },
        };
    } catch (e) {
        logger.error(
            `External archive search failed: ${e instanceof Error ? e.message : String(e)}`
        );
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                message: `Search failed: ${e instanceof Error ? e.message : String(e)}`,
            },
        };
    }
};

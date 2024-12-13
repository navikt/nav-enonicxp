import { runQuery } from '../../../services/dataQuery/utils/queryRunners';
import { logger } from '../../../lib/utils/logging';

type SimpleHit = {
    _id: string;
    displayName: string;
};

export const externalArchiveSearchService = (req: XP.Request) => {
    try {
        const { query } = req.params;
        const requestId = `archive-${Date.now()}`;

        const result = runQuery({
            requestId,
            query,
            branch: 'published',
            batch: 0,
        });

        const simpleHits = result.hits.map(
            (hit): SimpleHit => ({
                _id: hit._id,
                displayName: hit.displayName,
            })
        );

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                total: result.total,
                hits: simpleHits,
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

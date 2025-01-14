import { runQuery } from '../../../services/dataQuery/utils/queryRunners';
import { logger } from '../../../lib/utils/logging';

type SimpleHit = {
    _id: string;
    _path: string;
    layerLocale: string;
    displayName: string;
    type: string;
};

export const externalArchiveSearchService = (req: XP.Request) => {
    try {
        const { query } = req.params;
        const requestId = `archive-${Date.now()}`;

        const result = runQuery({
            requestId,
            query: `displayName LIKE "*${query}*"`,
            notExistsFilter: [
                { notExists: { field: 'x.no-nav-navno.previewOnly.previewOnly' } },
                { notExists: { field: 'data.externalProductUrl' } },
            ],
            branch: 'published',
            batch: 0,
            types: [
                'no.nav.navno:content-page-with-sidemenus',
                'no.nav.navno:themed-article-page',
                'no.nav.navno:situation-page',
                'no.nav.navno:guide-page',
            ],
        });

        const simpleHits = result.hits.map(
            (hit): SimpleHit => ({
                _id: hit._id,
                _path: hit._path,
                layerLocale: hit.layerLocale,
                displayName: hit.displayName,
                type: hit.type,
            })
        );

        return {
            status: 200,
            contentType: 'application/json',
            body: {
                total: result.total,
                hits: simpleHits,
                hasMore: result.hasMore,
                query: query,
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

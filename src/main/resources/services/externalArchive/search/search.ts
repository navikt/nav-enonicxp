import { Request } from '@enonic-types/core';
import { runExternalArchiveQuery } from '../../dataQuery/utils/queryRunners';
import { logger } from '../../../lib/utils/logging';
import { ContentDescriptor } from '../../../types/content-types/content-config';

type SimpleHit = {
    _id: string;
    _path: string;
    language: string | undefined;
    layerLocale: string;
    displayName: string;
    type: string;
};

export const externalArchiveSearchService = (req: Request) => {
    try {
        const { query, searchType } = req.params;
        const requestId = `archive-${Date.now()}`;

        const curatedTypes: ContentDescriptor[] = [
            'no.nav.navno:content-page-with-sidemenus',
            'no.nav.navno:themed-article-page',
            'no.nav.navno:situation-page',
            'no.nav.navno:guide-page',
            'no.nav.navno:main-article',
            'no.nav.navno:current-topic-page',
            'no.nav.navno:external-link',
            'no.nav.navno:internal-link',
            'no.nav.navno:product-details',
            'no.nav.navno:global-case-time-set',
            'no.nav.navno:payout-dates',
        ];

        const excludeTypes = ` AND NOT type IN (${curatedTypes.map((t) => `"${t}"`).join(',')})`;

        const result = runExternalArchiveQuery({
            requestId,
            query: `displayName LIKE "*${query}*"${searchType === 'other' ? excludeTypes : ''}`,
            types: searchType === 'curated' ? curatedTypes : [],
        });

        const simpleHits = result.hits.map(
            (hit): SimpleHit => ({
                _id: hit._id,
                _path: hit._path,
                layerLocale: hit.layerLocale,
                language: hit.language,
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

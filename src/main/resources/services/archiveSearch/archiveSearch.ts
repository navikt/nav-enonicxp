import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../../lib/repos/repo-utils';
import { getLayersData } from '../../lib/localization/layers-data';
import { logger } from '../../lib/utils/logging';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { sanitize } from '/lib/xp/common';
import { batchedNodeQuery } from '../../lib/utils/batched-query';

type ArchiveSearchParams = {
    query?: string;
    locale?: string;
    start?: number;
    count?: number;
};

type ArchiveSearchResult = {
    total: number;
    hits: Array<{
        id: string;
        path: string;
        displayName: string;
        type: string;
        modifiedTime: string;
        originalPath: string;
    }>;
    hasMore: boolean;
};

const DEFAULT_COUNT = 20;

const buildArchiveQuery = (query?: string) => {
    const filters = {
        boolean: {
            must: [
                {
                    exists: {
                        field: 'originalParentPath',
                    },
                },
                {
                    exists: {
                        field: 'originalName',
                    },
                },
                {
                    exists: {
                        field: 'publish.first',
                    },
                },
            ],
        },
    };

    const queryString = query
        ? `_path LIKE "/archive/*" AND fulltext("displayName^3,_path^2,_allText", "${sanitize(query)}*", "AND")`
        : '_path LIKE "/archive/*"';

    return { queryString, filters };
};

const searchArchive = ({
    query,
    locale,
    start = 0,
    count = DEFAULT_COUNT,
}: ArchiveSearchParams): ArchiveSearchResult => {
    const { localeToRepoIdMap } = getLayersData();
    const repoId = locale ? localeToRepoIdMap[locale] : Object.values(localeToRepoIdMap)[0];

    if (!repoId) {
        throw new Error(`Invalid locale: ${locale}`);
    }

    const repo = getRepoConnection({
        repoId,
        branch: 'draft',
        asAdmin: true,
    });

    const { queryString, filters } = buildArchiveQuery(query);

    const searchResult = batchedNodeQuery({
        repo,
        queryParams: {
            start,
            count,
            query: queryString,
            filters,
            sort: 'modifiedTime DESC',
        },
    });

    const contents = repo.get<Content>(searchResult.hits.map((hit) => hit.id));
    if (!contents) {
        return { total: 0, hits: [], hasMore: false };
    }

    const hits = Array.isArray(contents) ? contents : [contents];

    return {
        total: searchResult.total,
        hits: hits.map((content) => ({
            id: content._id,
            path: content._path,
            displayName: content.displayName,
            type: content.type,
            modifiedTime: content.modifiedTime || content.createdTime || new Date().toISOString(),
            originalPath: `${content.originalParentPath}/${content.originalName}`,
        })),
        hasMore: searchResult.total > start + count,
    };
};

logger.info('Archive search service is loading...');

export const get = (req: XP.Request) => {
    logger.info('Received archive search request');
    logger.info(`Request headers: ${JSON.stringify(req.headers)}`);

    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    try {
        const { query, locale, start, count } = req.params;

        const result = searchArchive({
            query,
            locale,
            start: start ? parseInt(start) : undefined,
            count: count ? parseInt(count) : undefined,
        });

        return {
            status: 200,
            body: result,
            contentType: 'application/json',
        };
    } catch (e) {
        logger.error(`Archive search error: ${e}`);
        return {
            status: 500,
            body: {
                message: `Search error: ${e}`,
            },
            contentType: 'application/json',
        };
    }
};

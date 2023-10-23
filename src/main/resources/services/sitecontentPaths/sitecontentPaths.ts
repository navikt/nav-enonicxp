import cacheLib from '/lib/cache';
import * as taskLib from '/lib/xp/task';
import { batchedContentQuery } from '../../lib/utils/batched-query';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { APP_DESCRIPTOR, NAVNO_ROOT_PATH, REDIRECTS_ROOT_PATH } from '../../lib/constants';
import {
    contentTypesRenderedByPublicFrontend,
    linkContentTypes,
} from '../../lib/contenttype-lists';
import { logger } from '../../lib/utils/logging';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { stripPathPrefix } from '../../lib/paths/path-utils';
import { getPublicPath } from '../../lib/paths/public-path';
import { removeDuplicates } from '../../lib/utils/array-utils';
import { buildLocalePath } from '../../lib/localization/locale-utils';
import { hasValidCustomPath } from '../../lib/paths/custom-paths/custom-path-utils';
import { queryAllLayersToRepoIdBuckets } from '../../lib/localization/layers-repo-utils/query-all-layers';

const cache = cacheLib.newCache({ size: 2, expire: 600 });

// Limited selection of content types for testing purposes
// (we don't want to build all 17000+ pages on every deploy while testing :)
const testContentTypes: ContentDescriptor[] = [
    'no.nav.navno:dynamic-page',
    'no.nav.navno:content-page-with-sidemenus',
    'no.nav.navno:situation-page',
];

const ONE_YEAR_MS = 1000 * 3600 * 24 * 365;
const SIX_HOURS_MS = 1000 * 3600 * 6;

const REDIRECTS_NODE_PATH = `/content${REDIRECTS_ROOT_PATH}/`;
const STATISTIKK_NODE_PATH = `/content${NAVNO_ROOT_PATH}/no/nav-og-samfunn/statistikk/`;
const KUNNSKAP_NODE_PATH = `/content${NAVNO_ROOT_PATH}/no/nav-og-samfunn/kunnskap/`;

const CONTENT_QUERY_SEGMENT = `_path LIKE '/content${NAVNO_ROOT_PATH}/*' AND _path NOT LIKE '${REDIRECTS_NODE_PATH}*'`;
const STATISTIKK_QUERY_SEGMENT = `type LIKE '${APP_DESCRIPTOR}:large-table' OR ((_path LIKE '${STATISTIKK_NODE_PATH}*' OR _path LIKE '${KUNNSKAP_NODE_PATH}*') AND type LIKE '${APP_DESCRIPTOR}:main-article*')`;
const NEWS_AND_PRESS_RELEASES_QUERY_SEGMENT = `type LIKE '${APP_DESCRIPTOR}:main-article*' AND (data.contentType='news' OR data.contentType='pressRelease')`;

const EXCLUDED_IF_OLD_QUERY_SEGMENT = `(${STATISTIKK_QUERY_SEGMENT}) OR (${NEWS_AND_PRESS_RELEASES_QUERY_SEGMENT})`;

// Prevent concurrent queries
let isRunning = false;
const waitUntilFinished = (msToWait = 60000) => {
    if (isRunning) {
        if (msToWait < 0) {
            throw new Error('Timed out while waiting for query to finish');
        }

        taskLib.sleep(1000);
        waitUntilFinished(msToWait - 1000);
    }
};

const getPathsToRender = (isTest?: boolean) => {
    const now = Date.now();
    // Exclude news, press releases and statistics content if more than one year old
    const oneYearAgo = new Date(now - ONE_YEAR_MS).toISOString();
    // Exclude content which will soon be unpublished, as this may cause a 404-error while building the static frontend
    const sixHoursFromNow = new Date(now + SIX_HOURS_MS).toISOString();

    const query = `(${CONTENT_QUERY_SEGMENT}) AND NOT publish.to < instant('${sixHoursFromNow}') AND NOT (modifiedTime < instant('${oneYearAgo}') AND (${EXCLUDED_IF_OLD_QUERY_SEGMENT}))`;

    const localeContentBuckets = queryAllLayersToRepoIdBuckets({
        branch: 'master',
        state: 'localized',
        resolveContent: true,
        queryParams: {
            start: 0,
            count: 20000,
            query,
            filters: {
                boolean: {
                    mustNot: {
                        hasValue: {
                            field: 'x.no-nav-navno.previewOnly.previewOnly',
                            values: ['true'],
                        },
                    },
                    must: {
                        hasValue: {
                            field: 'type',
                            values: isTest
                                ? testContentTypes
                                : contentTypesRenderedByPublicFrontend,
                        },
                    },
                },
            },
        },
    });

    const contentPaths = Object.entries(localeContentBuckets)
        .map(([locale, contentsArray]) =>
            contentsArray.map((content) => {
                const publicPath = getPublicPath(content, locale);

                // Include the base path if the content has a custom path, to ensure the redirect
                // from basepath -> custompath is included in the static frontend build
                if (hasValidCustomPath(content)) {
                    return [publicPath, buildLocalePath(stripPathPrefix(content._path), locale)];
                }

                return publicPath;
            })
        )
        .flat(2);

    if (isTest) {
        return removeDuplicates(contentPaths);
    }

    const redirectPaths = batchedContentQuery({
        start: 0,
        count: 20000,
        contentTypes: linkContentTypes,
        query: `_path LIKE '${REDIRECTS_NODE_PATH}*'`,
    }).hits.map((content) => content._path.replace(REDIRECTS_ROOT_PATH, ''));

    return removeDuplicates([...contentPaths, ...redirectPaths]);
};

const getFromCache = (isTest: boolean) => {
    try {
        waitUntilFinished();
        isRunning = true;

        return cache.get(isTest ? 'test' : 'full', () => getPathsToRender(isTest));
    } catch (e) {
        logger.error(`Error getting content paths - ${e}`);
        return null;
    } finally {
        isRunning = false;
    }
};

// This returns a full list of content paths that should be pre-rendered
// by the failover-instance of the frontend
export const get = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const startTime = Date.now();

    const paths = getFromCache(!!req.headers.test);

    if (!paths) {
        return {
            status: 500,
            body: {
                message: 'Unknown error',
            },
            contentType: 'application/json',
        };
    }

    logger.info(
        `Retrieved paths for ${paths.length} entries - Time spent: ${
            (Date.now() - startTime) / 1000
        } sec`
    );

    return {
        status: 200,
        body: paths,
        contentType: 'application/json',
    };
};

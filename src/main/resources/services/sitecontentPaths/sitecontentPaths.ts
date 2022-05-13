import contentLib from '/lib/xp/content';
import cacheLib from '/lib/cache';
import taskLib from '/lib/xp/task';
import { batchedContentQuery } from '../../lib/utils/batched-query';
import { hasValidCustomPath } from '../../lib/custom-paths/custom-paths';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { appDescriptor, navnoRootPath, redirectsRootPath } from '../../lib/constants';
import { removeDuplicates, stripPathPrefix } from '../../lib/utils/nav-utils';
import { contentTypesRenderedByPublicFrontend } from '../../lib/contenttype-lists';
import { logger } from '../../lib/utils/logging';

const cache = cacheLib.newCache({ size: 2, expire: 600 });

// Limited selection of content types for testing purposes
// (we don't want to build all 17000+ pages on every deploy while testing :)
const testContentTypes: ContentDescriptor[] = [
    'no.nav.navno:dynamic-page',
    'no.nav.navno:content-page-with-sidemenus',
    'no.nav.navno:situation-page',
];

const oneYearMs = 1000 * 3600 * 24 * 365;

const siteRootPath = `/content${navnoRootPath}/`;

const statistikkRootPath = `/content${navnoRootPath}/no/nav-og-samfunn/statistikk/`;
const kunnskapRootPath = `/content${navnoRootPath}/no/nav-og-samfunn/kunnskap/`;

const statistikkContent = `type LIKE '${appDescriptor}:large-table' OR ((_path LIKE '${statistikkRootPath}*' OR _path LIKE '${kunnskapRootPath}*') AND type LIKE '${appDescriptor}:main-article*')`;
const newsAndPressReleases = `type LIKE '${appDescriptor}:main-article*' AND (data.contentType='news' OR data.contentType='pressRelease')`;

const excludedOldContent = `(${statistikkContent}) OR (${newsAndPressReleases})`;

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
    try {
        const oneYearAgo = new Date(Date.now() - oneYearMs).toISOString();

        const contentPaths = batchedContentQuery({
            start: 0,
            count: 20000,
            contentTypes: isTest ? testContentTypes : contentTypesRenderedByPublicFrontend,
            query: `_path LIKE '${siteRootPath}*' AND NOT (modifiedTime < instant('${oneYearAgo}') AND (${excludedOldContent}))`,
        }).hits.reduce((acc, content) => {
            acc.push(stripPathPrefix(content._path));

            if (hasValidCustomPath(content)) {
                acc.push(content.data.customPath);
            }

            return acc;
        }, [] as string[]);

        if (isTest) {
            return contentPaths;
        }

        const redirectPaths = contentLib
            .getChildren({ key: redirectsRootPath, count: 1000 })
            .hits.map((content) => content._path.replace(redirectsRootPath, ''));

        return removeDuplicates([...contentPaths, ...redirectPaths]);
    } catch (e) {
        logger.error(`Error while retrieving content paths - ${e}`);
        return null;
    }
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
    const { secret, test } = req.headers;

    if (secret !== app.config.serviceSecret) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    const startTime = Date.now();

    const paths = getFromCache(!!test);

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

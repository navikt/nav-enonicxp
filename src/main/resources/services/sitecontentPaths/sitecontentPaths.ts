import contentLib from '/lib/xp/content';
import cacheLib from '/lib/cache';
import { batchedContentQuery } from '../../lib/utils/batched-query';
import { hasCustomPath } from '../../lib/custom-paths/custom-paths';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { navnoRootPath, redirectsPath } from '../../lib/constants';
import { removeDuplicates, stripPathPrefix } from '../../lib/utils/nav-utils';
import { contentTypesRenderedByFrontend } from '../../lib/contenttype-lists';

const cache = cacheLib.newCache({ size: 2, expire: 600 });

// Limited selection of content types for testing purposes
// (we don't want to build all 17000+ pages on every deploy while testing :)
const testContentTypes: ContentDescriptor[] = [
    'no.nav.navno:dynamic-page',
    'no.nav.navno:content-page-with-sidemenus',
    'no.nav.navno:situation-page',
];

const siteRootPath = `/content${navnoRootPath}/`;
const statistikkRootPath = `/content${navnoRootPath}/no/nav-og-samfunn/statistikk/`;
const queryString = `_path LIKE '${siteRootPath}*' AND _path NOT LIKE '${statistikkRootPath}*'`;

const getPathsToRender = (isTest?: boolean) => {
    try {
        const contentPaths = batchedContentQuery({
            start: 0,
            count: 20000,
            contentTypes: isTest ? testContentTypes : contentTypesRenderedByFrontend,
            query: queryString,
        }).hits.reduce((acc, content) => {
            acc.push(stripPathPrefix(content._path));

            if (hasCustomPath(content)) {
                acc.push(content.data.customPath);
            }

            return acc;
        }, [] as string[]);

        if (isTest) {
            return contentPaths;
        }

        const redirectPaths = contentLib
            .getChildren({ key: redirectsPath, count: 1000 })
            .hits.map((content) => content._path.replace(redirectsPath, ''));

        return removeDuplicates([...contentPaths, ...redirectPaths]);
    } catch (e) {
        log.error(`Error while retrieving content paths - ${e}`);
        return null;
    }
};

const getFromCache = (isTest: boolean) => {
    try {
        return cache.get(isTest ? 'test' : 'full', () => getPathsToRender(isTest));
    } catch (e) {
        return null;
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

    log.info(
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

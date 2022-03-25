import contentLib from '/lib/xp/content';
import { batchedContentQuery } from '../../lib/utils/batched-query';
import { hasCustomPath } from '../../lib/custom-paths/custom-paths';
import { sitemapContentTypes } from '../../lib/sitemap/sitemap';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { redirectsPath } from '../../lib/constants';
import { stripPathPrefix } from '../../lib/utils/nav-utils';

// Limited selection of content types for testing purposes
// (we don't want to build all ~15000 pages on every deploy while testing :)
const testContentTypes: ContentDescriptor[] = [
    'no.nav.navno:dynamic-page',
    'no.nav.navno:content-page-with-sidemenus',
    'no.nav.navno:situation-page',
];

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

    const contentPaths = batchedContentQuery({
        start: 0,
        count: 20000,
        contentTypes: test ? testContentTypes : sitemapContentTypes,
    }).hits.reduce((acc, content) => {
        const standardPath = stripPathPrefix(content._path);

        if (hasCustomPath(content)) {
            return [...acc, standardPath, content.data.customPath];
        }

        return [...acc, standardPath];
    }, [] as string[]);

    const redirectPaths = contentLib
        .getChildren({ key: redirectsPath, count: 1000 })
        .hits.map((content) => content._path.replace(redirectsPath, ''));

    return {
        status: 200,
        body: [...contentPaths, ...redirectPaths],
        contentType: 'application/json',
    };
};

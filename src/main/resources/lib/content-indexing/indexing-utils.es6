const contentLib = require('/lib/xp/content');
const { forceArray } = require('/lib/nav-utils');
const { frontendOrigin } = require('/lib/headless/url-origin');
const { isValidCustomPath } = require('/lib/custom-paths/custom-paths');

const getExternalUrl = (content) => {
    if (content.data?.canonicalUrl) {
        return content.data.canonicalUrl;
    }

    const customPath = content.data?.customPath;

    const pathname = isValidCustomPath(customPath)
        ? customPath
        : content._path.replace(/^\/www.nav.no/, '');

    return `${frontendOrigin}${pathname}`;
};

const getIndexableContent = ({ contentTypes, ids, start = 0, count = 100000 }) =>
    contentLib.query({
        start,
        count,
        contentTypes,
        filters: {
            ...(ids && { ids: { values: forceArray(ids) } }),
            boolean: {
                mustNot: {
                    hasValue: {
                        field: 'data.noindex',
                        values: ['true'],
                    },
                    exists: {
                        field: 'data.externalProductUrl',
                    },
                },
            },
        },
    }).hits;

module.exports = {
    getExternalUrl,
    getIndexableContent,
};

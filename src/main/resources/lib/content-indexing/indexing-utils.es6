const contentLib = require('/lib/xp/content');
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

const getIndexableContent = (contentTypes, start = 0, count = 100000) =>
    contentLib.query({
        start,
        count,
        contentTypes,
        filters: {
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

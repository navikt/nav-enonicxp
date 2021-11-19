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

module.exports = {
    getExternalUrl,
};

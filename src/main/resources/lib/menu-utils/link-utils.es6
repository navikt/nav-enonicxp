const libs = {
    portal: require('/lib/xp/portal'),
};

const getUrlOrPage = (url, pageId) => {
    if (url) {
        return url;
    }
    return libs.portal.pageUrl({
        id: pageId,
    });
};

module.exports = {
    getUrlOrPage,
};

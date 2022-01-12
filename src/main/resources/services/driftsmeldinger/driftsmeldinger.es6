const libs = {
    content: require('/lib/xp/content'),
    portal: require('/lib/xp/portal'),
    cache: require('/lib/siteCache'),
};

const constructMessage = (message) => {
    if (message && message.data) {
        const heading = message.displayName;
        const url = libs.portal.pageUrl({ path: message._path });
        const type = message.data.type;
        return {
            heading,
            url,
            type,
        };
    }
    return false;
};

const handleGet = (req) => {
    const content = libs.portal.getContent();
    const language = content?.language || 'no';

    const body = libs.cache.getDriftsmeldingerCache(language, req.branch, () => {
        const result = libs.content.getChildren({
            key: '/www.nav.no/no/driftsmeldinger',
            start: 0,
            count: 2,
            sort: '_manualordervalue DESC',
        });
        const messages = result.hits
            .filter((item) => item.type === 'no.nav.navno:melding')
            .map((item) => constructMessage(item));
        return messages || [];
    });

    return {
        body,
        contentType: 'application/json',
    };
};
exports.get = handleGet;

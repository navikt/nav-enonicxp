const libs = {
    content: require('/lib/xp/content'),
    tools: require('/lib/migration/tools'),
};

let max = 0;
let current = 0;
exports.handleLinks = function (socket) {
    // find all urls in content and convert to content://{id} where possible
    max = 2;
    current = 0;
    socket.emit('fix-links-max', max);
    // www.nav.no site
    replaceUrlsInContent(libs.content.get({
        key: '/www.nav.no/',
    }), socket);

    // content site
    replaceUrlsInContent(libs.content.get({
        key: '/content/',
    }), socket);
};

function replaceUrlsInContent (elem, socket) {
    const urls = libs.tools.getUrlsInContent(elem);
    if (urls.length >= 1) {
        log.info(urls.length + ' URLS FOUND ON ' + elem._path);
        urls.forEach(url => {
            log.info('URL FOUND :: ' + url);
            const result = libs.tools.getIdFromUrl(url);
            if (result.external === false && result.invalid === false) {
                log.info('REPLACE URL ON ' + elem._path);
                libs.tools.modify(elem, `content://${result.refId}`, url);
            }
        });
    }

    current += 1;
    socket.emit('fix-links-value', current);

    // loop over children and replace urls there as well
    let children = [];
    let start = 0;
    const count = 100;
    let length = count;
    while (count === length) {
        const hits = libs.content.getChildren({
            key: elem._id,
            start: start,
            count: count,
        }).hits;

        length = hits.length;
        start += length;

        children = children.concat(hits);
    }

    max += children.length;
    socket.emit('fix-links-max', max);

    children.forEach(c => replaceUrlsInContent(c, socket));
}

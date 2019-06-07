var libs = {
    content: require('/lib/xp/content'),
    contentTranslator: require('/lib/migration/contentTranslator'),
};

exports.handleContentAZ = function (socket) {
    // NO
    socket.emit('content-az-status', 'moving A-Å');
    moveLinks(socket, '/www.nav.no/no/innhold-a-aa/innhold-footer-a-til-aa', '/content/nav.no-ressurser/lenker/snarveier-a-a', '/www.nav.no/no/innhold-a-aa/');

    // EN
    socket.emit('content-az-status', 'moving A-Z');
    moveLinks(socket, '/www.nav.no/en/content-a-z/content-footer-a-z', '/content/nav.no-ressurser/lenker/shortcuts-a-z', '/www.nav.no/en/content-a-z/');

    socket.emit('content-az-status', 'done');
};

function moveLinks (socket, sectionKey, contentSiteKey, targetPath) {
    var contentSection = libs.content.get({
        key: sectionKey,
    });
    socket.emit('content-az-max', contentSection.data.sectionContents.length);
    // move all the links and urls up one level (and from /content) and delete the unnecessary cms2xp_section
    contentSection.data.sectionContents.forEach(function (id, index) {
        moveTo(id, targetPath);
        socket.emit('content-az-value', index + 1);
    });

    // do the same with children
    libs.content
        .getChildren({
            key: contentSection._id,
            start: 0,
            count: 1000,
        })
        .hits.forEach(function (el) {
            moveTo(el._id, targetPath);
        });

    // delete section
    libs.content.delete({
        key: sectionKey,
    });

    // move the rest of the links that are still left in /content
    libs.content
        .getChildren({
            key: contentSiteKey,
            start: 0,
            count: 1000,
        })
        .hits.forEach(function (el) {
            moveTo(el._id, targetPath);
        });
}

function moveTo (id, path) {
    try {
        libs.content.move({
            source: id,
            target: path,
        });
    } catch (e) {
        log.info('Could not move ' + id);
    }
}

var libs = {
    content: require('/lib/xp/content')
};

exports.handleContentAZ = function(socket) {
    // NO
    socket.emit('content-az-status', 'moving A-Å');
    moveLinks(socket, '/www.nav.no/no/innhold-a-aa/innhold-footer-a-til-aa', '/content/nav.no-ressurser/lenker/snarveier-a-a', '/www.nav.no/no/innhold-a-aa/');

    socket.emit('content-az-status', 'translating A-Å snarvei');
    translateNavSnarvei(socket, '/www.nav.no/no/innhold-a-aa');

    socket.emit('content-az-status', 'translating A-Å Ekstern_lenke');
    translateEksternLenke(socket, '/www.nav.no/no/innhold-a-aa');

    // EN
    socket.emit('content-az-status', 'moving A-Z');
    moveLinks(socket, '/www.nav.no/en/content-a-z/content-footer-a-z', '/content/nav.no-ressurser/lenker/shortcuts-a-z', '/www.nav.no/en/content-a-z/');

    socket.emit('content-az-status', 'translating A-Z snarvei');
    translateNavSnarvei(socket, '/www.nav.no/en/content-a-z');

    socket.emit('content-az-status', 'translating A-Z Ekstern_lenke');
    translateEksternLenke(socket, '/www.nav.no/en/content-a-z');

    socket.emit('content-az-status', 'done');
};

function translateNavSnarvei(socket, parentPath) {
    var children = libs.content
        .getChildren({
            key: parentPath,
            start: 0,
            count: 1000
        })
        .hits.filter(function(el) {
            return el.type === app.name + ':nav.snarvei';
        });
    socket.emit('content-az-max', children.length);
    children.forEach(function(snarvei, index) {
        // delete old nav snarvei
        libs.content.delete({
            key: snarvei._id
        });
        // create new shortcut
        if (snarvei.data.link) {
            libs.content.create({
                displayName: snarvei.displayName,
                parentPath: parentPath,
                contentType: 'base:shortcut',
                data: {
                    target: snarvei.data.link
                }
            });
        }
        socket.emit('content-az-value', index + 1);
    });
}

function translateEksternLenke(socket, parentPath) {
    var children = libs.content
        .getChildren({
            key: parentPath,
            start: 0,
            count: 1000
        })
        .hits.filter(function(el) {
            return el.type === app.name + ':Ekstern_lenke';
        });

    socket.emit('content-az-max', children.length);
    children.forEach(function(eksternLenke, index) {
        // delete old ekstern lenke
        libs.content.delete({
            key: eksternLenke._id
        });
        // create new url
        if (eksternLenke.data.url) {
            libs.content.create({
                displayName: eksternLenke.displayName,
                parentPath: parentPath,
                contentType: app.name + ':url',
                data: {
                    url: eksternLenke.data.url
                }
            });
        }
        socket.emit('content-az-value', index + 1);
    });
}

function moveLinks(socket, sectionKey, contentSiteKey, targetPath) {
    var contentSection = libs.content.get({
        key: sectionKey
    });
    socket.emit('content-az-max', contentSection.data.sectionContents.length);
    // move all the links and urls up one level (and from /content) and delete the unnecessary cms2xp_section
    contentSection.data.sectionContents.forEach(function(id, index) {
        moveTo(id, targetPath);
        socket.emit('content-az-value', index + 1);
    });

    // do the same with children
    libs.content
        .getChildren({
            key: contentSection._id,
            start: 0,
            count: 1000
        })
        .hits.forEach(function(el) {
            moveTo(el._id, targetPath);
        });

    // delete section
    libs.content.delete({
        key: sectionKey
    });

    // move the rest of the links that are still left in /content
    libs.content
        .getChildren({
            key: contentSiteKey,
            start: 0,
            count: 1000
        })
        .hits.forEach(function(el) {
            moveTo(el._id, targetPath);
        });
}

function moveTo(id, path) {
    try {
        libs.content.move({
            source: id,
            target: path
        });
    } catch (e) {
        log.info('Could not move ' + id);
    }
}

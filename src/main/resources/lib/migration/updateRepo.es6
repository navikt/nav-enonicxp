const libs = {
    content: require('/lib/xp/content'),
    node: require('/lib/xp/node'),
    tools: require('/lib/migration/tools'),
    navUtils: require('/lib/nav-utils'),
};

function convert(socket) {
    const repo = libs.node.connect({
        repoId: 'com.enonic.cms.default',
        branch: 'draft',
        principals: ['role:system.admin'],
    });
    const hits = libs.content.query({
        start: 0,
        count: 10000,
        query: 'data.menuListItems.related-information.files LIKE "*"',
    }).hits;
    socket.emit('convert-nodes-max', hits.length);
    hits.forEach((element, index) => {
        socket.emit('convert-nodes-value', index + 1);
        repo.modify({
            key: element._id,
            requireValid: false,
            editor: c => {
                const target = c.data.menuListItems['related-information'];
                log.info(element._path);
                log.info(JSON.stringify(target, null, 4));
                if (target.files) {
                    if (target.link) {
                        target.link = libs.navUtils.forceArray(target.link);
                        target.link = target.link.concat(target.files);
                    } else {
                        target.link = target.files;
                    }
                    delete target.files;
                }
                log.info(JSON.stringify(target, null, 4));
                return c;
            },
        });
        repo.push({
            key: element._id,
            target: 'master',
        });
    });
}

exports.handle = convert;

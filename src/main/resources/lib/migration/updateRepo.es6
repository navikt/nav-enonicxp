const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    node: require('/lib/xp/node'),
    value: require('/lib/xp/value'),
    tools: require('/lib/migration/tools'),
};

function convert(socket) {
    const hits = libs.content.query({
        start: 0,
        count: 10000,
        query: 'data.menuListItems.related-information.files LIKE "*"',
    }).hits;

    socket.emit('convert-nodes-max', hits.length);
    // eslint-disable-next-line array-callback-return
    hits.map((element, index) => {
        log.info(JSON.stringify(element, null, 4));
        socket.emit('convert-nodes-value', index + 1);
        libs.content.modify({
            key: element._id,
            editor: c => {
                const target = c.data.menuListItems['related-information'];
                log.info(JSON.stringify(target, null, 4));
                if (target.files) {
                    if (target.link) {
                        log.info('link');
                        target.link.push(target.files);
                    } else {
                        log.info('NO link');
                        target.link = target.files;
                    }
                    // delete target.files;
                }
                return c;
            },
        });
    });
}

exports.handle = convert;

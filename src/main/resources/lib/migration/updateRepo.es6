const libs = {
    content: require('/lib/xp/content'),
    tools: require('/lib/migration/tools'),
    navUtils: require('/lib/nav-utils'),
};

function convert(socket) {
    const hits = libs.content.query({
        start: 0,
        count: 10000,
        query: 'data.menuListItems.related-information.files LIKE "*"',
    }).hits;
    const keys = [];
    socket.emit('convert-nodes-max', hits.length);
    // eslint-disable-next-line array-callback-return
    hits.forEach((element, index) => {
        socket.emit('convert-nodes-value', index + 1);
        keys.push(element._id);
        libs.content.modify({
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
    });
    log.info(`Publish ${keys.length} elements`);
    log.info(JSON.stringify(keys, null, 4));
    const result = libs.content.publish({
        keys,
        sourceBranch: 'draft',
        targetBranch: 'master',
        // excludeChildrenIds: keys,
        includeDependencies: false,
    });
    if (result) {
        log.info(`Pushed ${result.pushedContents.length} content`);
        log.info(`Deleted ${result.deletedContents.length} content`);
        log.info(`Content that failed operation: ${result.failedContents.length}`);
    } else {
        log.info('Operation failed.');
    }
}

exports.handle = convert;

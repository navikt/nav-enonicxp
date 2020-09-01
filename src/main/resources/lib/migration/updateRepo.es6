const libs = {
    content: require('/lib/xp/content'),
    node: require('/lib/xp/node'),
    tools: require('/lib/migration/tools'),
    navUtils: require('/lib/nav-utils'),
};

function convert(socket) {
    const repoDraft = libs.node.connect({
        repoId: 'com.enonic.cms.default',
        branch: 'draft',
        principals: ['role:system.admin'],
    });
    const repoMaster = libs.node.connect({
        repoId: 'com.enonic.cms.default',
        branch: 'master',
        principals: ['role:system.admin'],
    });
    const draftHits = libs.content.query({
        start: 0,
        count: 10000,
        query: 'data.menuListItems.related-information.files LIKE "*"',
    }).hits;
    const targetIds = [];
    socket.emit('convert-nodes-max', draftHits.length);
    draftHits.forEach((element, index) => {
        socket.emit('convert-nodes-value', index + 1);
        libs.content.modify({
            key: element._id,
            requireValid: false,
            editor: (c) => {
                const current = { ...c };
                const target = current.data.menuListItems['related-information'];
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
                return current;
            },
        });
        targetIds.push(element._id);
    });
    log.info(`Modified ${draftHits.length} elements in draft`);
    const masterHits = repoMaster.query({
        count: targetIds.length,
        filters: {
            ids: {
                values: targetIds,
            },
        },
    }).hits;
    const masterIds = masterHits.map((el) => el.id);
    repoDraft.push({
        keys: masterIds,
        target: 'master',
    });
    log.info(`Pushed ${masterIds.length} elements to master`);
}

exports.handle = convert;

const libs = {
    content: require('/lib/xp/content'),
    node: require('/lib/xp/node'),
    tools: require('/lib/migration/tools'),
    navUtils: require('/lib/nav-utils'),
};

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

function createDialog(header, action) {
    return {
        isNew: true,
        head: `${header}`,
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: ['row'],
                    elements: [
                        {
                            tag: 'button',
                            text: 'Start oppdatering',
                            action: `${action}`,
                            id: 'testid',
                            tagClass: ['button', 'is-info'],
                        },
                        {
                            tag: 'div',
                            update: 'progressUpdate',
                        },
                    ],
                },
            ],
        },
    };
}
function republishLiveElements(targetIds) {
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

function convertImages(socket) {
    const draftHits = libs.content.query({
        start: 0,
        count: 10000,
        query: 'data.image LIKE "*"',
    }).hits;

    socket.emit('convert-nodes-max', draftHits.length);
    let targetIds = draftHits.map((elem, ix) => {
        socket.emit('convert-nodes-value', ix + 1);
        const data = elem.data;
        const { caption, imagesize } = data;
        const image = libs.content.get({ key: data.image });
        const modifiedContent = libs.content.modify({
            key: elem._id,
            requireValid: false,
            editor: (c) => {
                const current = { ...c };
                const targetProps = current.data.picture || {};
                current.data.picture = {
                    ...targetProps,
                    target: current.data.image,
                    size: imagesize || '100',
                    caption: caption || image.displayName,
                    altText: caption || image.displayName,
                };
                return current;
            },
        });

        socket.emit('progressUpdate', `${elem.displayName} - ${elem._path}`);
        return modifiedContent ? modifiedContent._id : undefined;
    });

    // publish changes
    targetIds = targetIds.filter((elem) => {
        return !!elem;
    });
    republishLiveElements(targetIds);
    return targetIds;
}

function handleImages(socket) {
    const action = 'convertimages';
    const elements = createDialog('Konverter bilder for alt-tekst', action);
    socket.emit('newTask', elements);

    socket.on(action, () => {
        libs.tools.runInContext(socket, convertImages);
    });
}

function convert(socket) {
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
    republishLiveElements(targetIds);
}

module.exports = { handle: convert, handleImages };

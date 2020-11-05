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

    // important that we use resolve false when pushing objects to master, else we can get objects
    // which were unpublished back to master without a published.from property
    const pushResult = repoDraft.push({
        keys: masterIds,
        resolve: false,
        target: 'master',
    });

    log.info(`Pushed ${masterIds.length} elements to master`);
    log.info(JSON.stringify(pushResult, null, 4));
}

function unpublisher(socket) {
    const masterHits = repoMaster.query({
        count: 10000,
        query: 'publish.from NOT LIKE "*" AND (type LIKE "no.nav.navno:*" OR type LIKE "media:*")',
    }).hits;

    socket.emit('unpublish-nodes-max', masterHits.length);
    let targets = masterHits.map((elem, ix) => {
        socket.emit('unpublish-nodes-value', ix + 1);
        let targetContent = false;
        try {
            targetContent = repoDraft.get(elem.id);
        } catch (e) {
            log.info('error for: ');
            log.info(JSON.stringify(elem, null, 4));
        }
        if (targetContent) {
            log.info(`unpublish: ${targetContent._path}|${targetContent.displayName}`);
            socket.emit('progressUpdate', `${targetContent._path}|${targetContent.displayName}`);
            return targetContent._id;
        }
        return false;
    });

    socket.emit('progressUpdate', `done`);
    // publish changes
    targets = targets.filter((elem) => {
        return !!elem;
    });

    const unpublishedResult = libs.content.unpublish({ keys: targets });
    log.info(`unpublished ${targets.length} elements`);
    log.info('Unpublished content ids: ' + unpublishedResult.join(','));
    return targets;
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
        let modifiedContent;
        if (image) {
            modifiedContent = libs.content.modify({
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
        } else {
            socket.emit(
                'progressUpdate',
                `image NOT found for ${elem.displayName} - ${elem._path}`
            );
            log.info(`image NOT found for ${elem.displayName} - ${elem._path}`);
        }
        return modifiedContent ? modifiedContent._id : undefined;
    });

    // publish changes
    targetIds = targetIds.filter((elem) => {
        return !!elem;
    });

    republishLiveElements(targetIds);
    return targetIds;
}

function handleUnpublish(socket) {
    const action = 'unpublish';
    const elements = createDialog('Avpublisererer', action);
    socket.emit('newTask', elements);
    socket.on(action, () => {
        libs.tools.runInContext(socket, unpublisher);
    });
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

module.exports = { handle: convert, handleImages, handleUnpublish };

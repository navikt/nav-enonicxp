const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    task: require('/lib/xp/task'),
    node: require('/lib/xp/node'),
    repo: require('/lib/xp/repo'),
    cacheControll: require('/lib/cacheControll'),
};
const masterRepo = libs.node.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'master',
    principals: ['role:system.admin'],
});
const draftRepo = libs.node.connect({
    repoId: 'com.enonic.cms.default',
    branch: 'draft',
    principals: ['role:system.admin'],
});

let prevTestDate = new Date();

exports.setupTask = setupTask;
function setupTask () {
    libs.task.submit({
        description: 'clean out expired content from cache',
        task: () => {
            const testDate = new Date();
            // remove cache for prepublished content
            const prepublishedContent = getPrepublishedContent(testDate);
            removeCacheOnPrepublishedContent(prepublishedContent);
            // unpublish expired content
            log.info('UNPUBLISH EXPIRED CONTENT');
            const expiredContent = getExpiredContent(testDate);
            removeExpiredContentFromMaster(expiredContent);
            // save last test date for next run
            prevTestDate = testDate;
            // 1 minute between each check
            libs.task.sleep(60000);
            setupTask();
        },
    });
}

function getPrepublishedContent (testDate) {
    let prepublishedContent = [];
    let start = 0;
    let count = 1000;
    while (count === 1000) {
        log.info(`publish.from < instant("${testDate.toISOString()}") AND publish.from > instant("${prevTestDate.toISOString()}")`);
        const hits = masterRepo.query({
            start,
            count,
            query: `publish.from < instant("${testDate.toISOString()}") AND publish.from > instant("${prevTestDate.toISOString()}")`,
        }).hits;
        count = hits.length;
        start += count;
        prepublishedContent = prepublishedContent.concat(hits);
    }
    return prepublishedContent;
}

function removeCacheOnPrepublishedContent (prepublishedContent) {
    libs.context.run(
        {
            repository: 'com.enonic.cms.default',
            branch: 'master',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        () => {
            prepublishedContent.forEach((el) => {
                const content = libs.content.get({
                    key: el.id,
                });
                libs.cacheControll.wipeOnChange(content._path);
                libs.cacheControll.clearReferences(content._id, content._path, 0);
            });
        }
    );
    log.info(`PREPUBLISHED (${prepublishedContent.length}) CACHE CLEARED`);
}

function getExpiredContent (testDate) {
    let expiredContent = [];
    let start = 0;
    let count = 1000;
    while (count === 1000) {
        const hits = masterRepo.query({
            start,
            count,
            query: `publish.to < instant("${testDate.toISOString()}")`,
        }).hits;
        count = hits.length;
        start += count;
        expiredContent = expiredContent.concat(hits);
    }
    return expiredContent;
}

function removeExpiredContentFromMaster (expiredContent) {
    expiredContent.forEach((c) => {
        const content = masterRepo.get(c.id);
        try {
            masterRepo.delete(content._path);
            draftRepo.modify({
                key: content._path,
                editor: draftContent => {
                    delete draftContent.publish.to;
                    delete draftContent.publish.from;
                    return draftContent;
                },
            });
            log.info(`UNPUBLISHED :: ${content._path}`);
        } catch (e) {
            log.info('ERROR');
            log.info(e);
        }
    });
    log.info(`UNPUBLISHED (${expiredContent.length}) EXPIRED CONTENT`);
}

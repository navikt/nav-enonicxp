const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    task: require('/lib/xp/task'),
    node: require('/lib/xp/node'),
    repo: require('/lib/xp/repo'),
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

exports.setupTask = setupTask;
function setupTask () {
    libs.task.submit({
        description: 'clean out expired content from cache',
        task: () => {
            log.info('UNPUBLISH EXPIRED CONTENT');
            let expiredContent = [];
            let start = 0;
            let count = 1000;
            while (count === 1000) {
                const hits = masterRepo.query({
                    start,
                    count,
                    query: `publish.to < instant("${new Date().toISOString()}")`,
                }).hits;
                count = hits.length;
                start += count;
                expiredContent = expiredContent.concat(hits);
            }

            expiredContent.forEach((c) => {
                const content = masterRepo.get(c.id);
                masterRepo.delete(content._path);
                log.info(`UNPUBLISHED :: ${content._path}`);
                draftRepo.modify({
                    key: content._path,
                    editor: draftContent => {
                        delete draftContent.publish.to;
                        delete draftContent.publish.from;
                        return draftContent;
                    },
                });
            });

            // 1 minute between each check
            libs.task.sleep(60000);
            setupTask();
        },
    });
}

const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    value: require('/lib/xp/value'),
    node: require('/lib/xp/node'),
    repo: require('/lib/xp/repo'),
};

/**
 * @description run a function in admin context on the draft branch
 * @param socket socket to pass into func as a param
 * @param func the function to run
 */
function runInMasterContext(socket, func) {
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
        function () {
            func(socket);
        }
    );
}

function getNavRepo() {
    const hasNavRepo = libs.repo.get('no.nav.navno');
    if (!hasNavRepo) {
        log.info('Create no.nav.navno repo');
        libs.repo.create({
            id: 'no.nav.navno',
        });
    }

    const navRepo = libs.node.connect({
        repoId: 'no.nav.navno',
        branch: 'master',
        user: {
            login: 'su',
        },
        pricipals: ['role:system.admin'],
    });

    return navRepo;
}

/**
 * @description run a function in admin context on the draft branch
 * @param socket socket to pass into func as a param
 * @param func the function to run
 */
function runInContext(socket, func) {
    libs.context.run(
        {
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        function () {
            func(socket);
        }
    );
}

module.exports = {
    getNavRepo,
    runInContext,
    runInMasterContext,
};

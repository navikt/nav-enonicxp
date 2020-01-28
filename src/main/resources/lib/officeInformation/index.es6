const libs = {
    repo: require('/lib/xp/repo'),
    node: require('/lib/xp/node'),
    content: require('/lib/xp/content'),
    httpClient: require('/lib/http-client'),
    task: require('/lib/xp/task'),
    tools: require('/lib/migration/tools'),
    cron: require('/lib/cron'),
    cluster: require('/lib/xp/cluster'),
};

exports.startCronJob = function () {
    libs.cron.unschedule({
        name: 'office_info_norg2_daily',
    });
    libs.cron.schedule({
        name: 'office_info_norg2_daily',
        cron: '10 4 * * *',
        context: {
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        callback: () => {
            // stop if the config is missing, or the node is not a master
            if (libs.cluster.isMaster() && app.config && app.config.norg2 && app.config.norg2ApiKey && app.config.norg2ConsumerId) {
                checkForRefresh();
            }
        },
    });
};

function startBackupJob() {
    // stop cron job first, just in case it has been failing for more than a day
    libs.cron.unschedule({
        name: 'office_info_norg2_hourly',
    });
    libs.cron.schedule({
        name: 'office_info_norg2_hourly',
        cron: '15 * * * *',
        times: 1,
        context: {
            repository: 'com.enonic.cms.default',
            branch: 'draft',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        callback: () => {
            // stop if the config is missing, or the node is not a master
            if (libs.cluster.isMaster() && app.config && app.config.norg2 && app.config.norg2ApiKey && app.config.norg2ConsumerId) {
                checkForRefresh();
            }
        },
    });
}

function checkForRefresh() {
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

    let officeInformation = navRepo.get('/officeInformation');
    if (!officeInformation) {
        log.info('Create office information node');
        officeInformation = navRepo.create({
            _name: 'officeInformation',
            parentPath: '/',
            refresh: true,
            data: {
                lastRefresh: null,
                lastRefreshFormated: new Date().toISOString(),
                isRefreshing: false,
                failedLastRefresh: false,
            },
        });
    }

    // set isRefreshing true so only cluster node runs this
    setIsRefreshing(navRepo, true);

    let failedToRefresh = false;
    // get data from norg2
    try {
        const response = libs.httpClient.request({
            url: app.config.norg2,
            method: 'GET',
            headers: {
                'x-nav-apiKey': app.config.norg2ApiKey,
                consumerId: app.config.norg2ConsumerId,
            },
        });

        const officeInformationList = JSON.parse(response.body);
        refreshOfficeInformation(officeInformationList);

        log.info('PUBLISH OFFICE INFORMATION');
        libs.content.publish({
            keys: ['/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontakt-oss_2/kontorer'],
            sourceBranch: 'draft',
            targetBranch: 'master',
            includeDependencies: true,
        });
    } catch (e) {
        log.info('FAILED TO GET OFFICE INFORMATION FROM NORG2');
        log.info(e);
        failedToRefresh = true;
    }

    // set isRefreshing to false since we're done refresing office information
    setIsRefreshing(navRepo, false, failedToRefresh);

    if (failedToRefresh) {
        startBackupJob();
    }
}

function setIsRefreshing(navRepo, isRefreshing, failed) {
    navRepo.modify({
        key: '/officeInformation',
        editor: (o) => {
            if (isRefreshing === false) {
                o.data.failedLastRefresh = failed;
                // only update last refresh when its finished refresing and did not fail
                if (failed === false) {
                    o.data.lastRefresh = Date.now();
                    o.data.lastRefreshFormated = new Date();
                }
            }
            o.data.isRefreshing = isRefreshing;
            return o;
        },
    });
}

function refreshOfficeInformation(officeInformationList) {
    // find all existing offices
    const officeFolder = libs.content.get({
        key: '/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontakt-oss_2/kontorer',
    });

    const existingOffices = libs.content.getChildren({
        key: officeFolder._id,
        count: 2000,
    }).hits;

    const officesInNorg = {
        // map over offices in norg2, so we can delete old offices
    };

    // update office information or create new
    officeInformationList.forEach((officeInformation) => {
        // ignore closed offices
        if (officeInformation.enhet.status !== 'Nedlagt') {
            // check if the office already exists
            const existingOffice = existingOffices.filter((o) => {
                if (o.data && o.data.enhet && o.data.enhet.enhetId) {
                    return o.data.enhet.enhetId === officeInformation.enhet.enhetId;
                }
                return false;
            })[0];
            if (existingOffice) {
                log.info('UPDATE :: ' + officeInformation.enhet.enhetId);
                libs.content.modify({
                    key: existingOffice._id,
                    editor: (o) => {
                        o.data = officeInformation;
                        return o;
                    },
                });
            } else {
                log.info('CREATE :: ' + officeInformation.enhet.enhetId);
                libs.content.create({
                    parentPath: officeFolder._path,
                    displayName: officeInformation.enhet.navn,
                    contentType: app.name + ':office-information',
                    data: officeInformation,
                });
            }
            officesInNorg[officeInformation.enhet.enhetId] = true;
        }
    });

    // delete old offices
    existingOffices.forEach((existingOffice) => {
        let enhetId;
        if (existingOffice && existingOffice.data && existingOffice.data.enhet && existingOffice.data.enhet.enhetId) {
            enhetId = existingOffice.data.enhet.enhetId;
        }
        if (!officesInNorg[enhetId]) {
            log.info('DELETE :: ' + existingOffice._id + ' ' + existingOffice.displayName);
            log.info('ENHET :: ' + enhetId);
            libs.content.delete({
                key: existingOffice._id,
            });
        }
    });
}

const libs = {
    repo: require('/lib/xp/repo'),
    node: require('/lib/xp/node'),
    content: require('/lib/xp/content'),
    httpClient: require('/lib/http-client'),
    cron: require('/lib/cron'),
    cluster: require('/lib/xp/cluster'),
    context: require('/lib/xp/context'),
    utils: require('/lib/nav-utils'),
};

function setIsRefreshing(navRepo, isRefreshing, failed) {
    navRepo.modify({
        key: '/officeInformation',
        editor: (o) => {
            const object = o;
            if (isRefreshing === false) {
                object.data.failedLastRefresh = failed;
                // only update last refresh when its finished refreshing and did not fail
                if (failed === false) {
                    object.data.lastRefresh = Date.now();
                    object.data.lastRefreshFormated = new Date();
                }
            }
            object.data.isRefreshing = isRefreshing;
            return object;
        },
    });
}

function refreshOfficeInformation(officeInformationList) {
    // find all existing offices
    const officeFolder = libs.content.get({
        key: '/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontorer',
    });

    const existingOffices = libs.content.getChildren({
        key: officeFolder._id,
        count: 2000,
    }).hits;

    const officesInNorg = {
        // map over offices in norg2, so we can delete old offices
    };

    const newOffices = [];
    const updated = [];
    const deleted = [];
    // update office information or create new
    officeInformationList.forEach((officeInformation) => {
        // ignore closed offices and include only selected types
        if (
            officeInformation.enhet.status !== 'Nedlagt' &&
            (officeInformation.enhet.type === 'ALS' ||
                officeInformation.enhet.type === 'ARK' ||
                officeInformation.enhet.type === 'FPY' ||
                officeInformation.enhet.type === 'FYLKE' ||
                officeInformation.enhet.type === 'HMS' ||
                officeInformation.enhet.type === 'INTRO' ||
                officeInformation.enhet.type === 'KLAGE' ||
                officeInformation.enhet.type === 'KONTAKT' ||
                officeInformation.enhet.type === 'KONTROLL' ||
                officeInformation.enhet.type === 'LOKAL' ||
                officeInformation.enhet.type === 'OKONOMI' ||
                officeInformation.enhet.type === 'TILTAK' ||
                officeInformation.enhet.type === 'YTA' ||
                officeInformation.enhet.type === 'OPPFUTLAND')
        ) {
            // check if the office already exists
            const existingOffice = existingOffices.find((o) => {
                return o.data && o.data.enhet && o.data.enhet.enhetId
                    ? o.data.enhet.enhetId === officeInformation.enhet.enhetId
                    : false;
            });
            if (existingOffice) {
                const existing = libs.utils.createObjectChecksum(existingOffice.data);
                const fetched = libs.utils.createObjectChecksum(officeInformation);
                if (existing !== fetched) {
                    updated.push(existingOffice._path);
                    libs.content.modify({
                        key: existingOffice._id,
                        editor: (o) => ({ ...o, data: officeInformation }),
                    });
                }
            } else {
                const result = libs.content.create({
                    parentPath: officeFolder._path,
                    displayName: officeInformation.enhet.navn,
                    contentType: app.name + ':office-information',
                    data: officeInformation,
                });
                newOffices.push(result._path);
            }
            officesInNorg[officeInformation.enhet.enhetId] = true;
        }
    });

    // delete old offices
    existingOffices.forEach((existingOffice) => {
        let enhetId;
        if (
            existingOffice &&
            existingOffice.data &&
            existingOffice.data.enhet &&
            existingOffice.data.enhet.enhetId
        ) {
            enhetId = existingOffice.data.enhet.enhetId;
        }
        if (!officesInNorg[enhetId]) {
            deleted.push(existingOffice._path);
            libs.content.delete({
                key: existingOffice._id,
            });
        }
    });

    // log info
    log.info(
        `NORG - Updated: ${updated.length} New: ${newOffices.length} Deleted: ${deleted.length}`
    );
    // extra logging
    if (updated.length > 0) {
        log.info(`Updated: ${JSON.stringify(updated, null, 4)}`);
    }
}

function checkForRefresh(oneTimeRun = false) {
    log.info('NORG - Start update');
    const startBackupJob = () => {
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
                if (
                    libs.cluster.isMaster() &&
                    app.config &&
                    app.config.norg2 &&
                    app.config.norg2ApiKey &&
                    app.config.norg2ConsumerId
                ) {
                    checkForRefresh();
                }
            },
        });
    };

    const hasNavRepo = libs.repo.get('no.nav.navno');
    if (!hasNavRepo) {
        log.info('NORG - Create no.nav.navno repo');
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

    if (!navRepo.get('/officeInformation')) {
        log.info('NORG - Create office information node');
        navRepo.create({
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

        log.info('NORG - Publish office information');
        libs.content.publish({
            keys: ['/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontorer'],
            sourceBranch: 'draft',
            targetBranch: 'master',
            includeDependencies: true,
        });
    } catch (e) {
        log.error('NORG - Failed to get office information from norg2');
        log.error(e);
        failedToRefresh = true;
    }

    // set isRefreshing to false since we're done refresing office information
    setIsRefreshing(navRepo, false, failedToRefresh);

    if (failedToRefresh && !oneTimeRun) {
        startBackupJob();
    }
}

exports.runOneTimeJob = () => {
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
        () => {
            const timerStart = Date.now();
            checkForRefresh(true);
            const mills = Date.now() - timerStart;
            log.info(`NORG: time elapsed: ${mills / 1000}s`);
        }
    );
};

exports.startCronJob = () => {
    libs.cron.unschedule({
        name: 'office_info_norg2_daily',
    });
    libs.cron.unschedule({
        name: 'office_info_norg2_hourly',
    });
    libs.cron.schedule({
        name: 'office_info_norg2_hourly',
        cron: '15 * * * *',
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
            if (
                libs.cluster.isMaster() &&
                app.config &&
                app.config.norg2 &&
                app.config.norg2ApiKey &&
                app.config.norg2ConsumerId
            ) {
                checkForRefresh();
            }
        },
    });
};

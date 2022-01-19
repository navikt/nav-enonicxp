const libs = {
    repo: require('/lib/xp/repo'),
    node: require('/lib/xp/node'),
    content: require('/lib/xp/content'),
    httpClient: require('/lib/http-client'),
    cron: require('/lib/cron'),
    cluster: require('/lib/xp/cluster'),
    context: require('/lib/xp/context'),
    utils: require('/lib/nav-utils'),
    common: require('/lib/xp/common'),
};

const parentFolder = '/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontorer';
const officeInfoContentType = `${app.name}:office-information`;

const selectedEnhetTypes = {
    ALS: true,
    ARK: true,
    FPY: true,
    FYLKE: true,
    HMS: true,
    INTRO: true,
    KLAGE: true,
    KONTAKT: true,
    KONTROLL: true,
    LOKAL: true,
    OKONOMI: true,
    TILTAK: true,
    YTA: true,
    OPPFUTLAND: true,
};

const logger = {
    info: (message) => log.info(`[office information] ${message}`),
    warning: (message) => log.warning(`[office information] ${message}`),
    error: (message) => log.error(`[office information] ${message}`),
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

function refreshOfficeInformation(officeInformationUpdated) {
    const existingOffices = libs.content
        .getChildren({
            key: parentFolder,
            count: 2000,
        })
        .hits.filter((office) => office.type === officeInfoContentType);

    const officesInNorg = {};

    const newOffices = [];
    const updated = [];
    const deleted = [];

    // update office information or create new
    officeInformationUpdated.forEach((updatedOfficeData) => {
        const { enhet } = updatedOfficeData;

        // ignore closed offices and include only selected types
        if (enhet.status !== 'Nedlagt' && selectedEnhetTypes[enhet.type]) {
            const existingOffice = existingOffices.find(
                (content) => content.data?.enhet?.enhetId === enhet.enhetId
            );

            // if the office page already exists, update the existing content
            if (existingOffice) {
                const existingChecksum = libs.utils.createObjectChecksum(existingOffice.data);
                const updatedChecksum = libs.utils.createObjectChecksum(updatedOfficeData);

                if (
                    existingChecksum !== updatedChecksum ||
                    existingOffice.displayName !== enhet.navn
                ) {
                    updated.push(existingOffice._path);
                    libs.content.modify({
                        key: existingOffice._id,
                        editor: (content) => ({
                            ...content,
                            displayName: enhet.navn,
                            data: updatedOfficeData,
                        }),
                    });
                }

                const currentName = existingOffice._name;
                const updatedName = libs.common.sanitize(enhet.navn);

                if (updatedName !== currentName) {
                    try {
                        logger.info(`Updating name/path: ${currentName} -> ${updatedName}`);

                        // Move the office info page to a new path if the name changed
                        libs.content.move({
                            source: existingOffice._path,
                            target: updatedName,
                        });

                        // Create a redirect from the old path
                        libs.content.create({
                            name: currentName,
                            parentPath: parentFolder,
                            displayName: `${existingOffice.displayName} (redirect til ${enhet.navn})`,
                            contentType: `${app.name}:internal-link`,
                            data: {
                                target: existingOffice._id,
                            },
                        });
                    } catch (e) {
                        logger.error(`Failed to updated office information name: ${e}`);
                    }
                }
            } else {
                const result = libs.content.create({
                    parentPath: parentFolder,
                    displayName: enhet.navn,
                    contentType: officeInfoContentType,
                    data: updatedOfficeData,
                });
                newOffices.push(result._path);
            }

            officesInNorg[enhet.enhetId] = true;
        }
    });

    // delete old offices
    existingOffices.forEach((existingOffice) => {
        const enhetId = existingOffice?.data?.enhet?.enhetId;
        if (!officesInNorg[enhetId]) {
            deleted.push(existingOffice._path);
            libs.content.delete({
                key: existingOffice._id,
            });
        }
    });

    logger.info(
        `NORG - Updated: ${updated.length} New: ${newOffices.length} Deleted: ${deleted.length}`
    );
    if (updated.length > 0) {
        logger.info(`Updated: ${JSON.stringify(updated, null, 4)}`);
    }
}

function checkForRefresh(oneTimeRun = false) {
    logger.info('NORG - Start update');
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
        logger.info('NORG - Create no.nav.navno repo');
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
        logger.info('NORG - Create office information node');
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

        logger.info('NORG - Publish office information');
        libs.content.publish({
            keys: ['/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontorer'],
            sourceBranch: 'draft',
            targetBranch: 'master',
            includeDependencies: true,
        });
    } catch (e) {
        logger.error('NORG - Failed to get office information from norg2');
        logger.error(e);
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
            logger.info(`NORG: time elapsed: ${mills / 1000}s`);
        }
    );
};

exports.startCronJob = () => {
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

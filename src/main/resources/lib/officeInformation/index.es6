const libs = {
    repo: require('/lib/xp/repo'),
    node: require('/lib/xp/node'),
    content: require('/lib/xp/content'),
    httpClient: require('/lib/http-client'),
    task: require('/lib/xp/task'),
    tools: require('/lib/migration/tools'),
};

const HOUR = 60 * 60 * 1000; // MINUTES * SECONDS * MS
const DAY = 24 * HOUR;
let lastCheckOnNode = null;

exports.submitCheckTask = function () {
    // ignore this if the config is missing
    if (!app.config || !app.config.norg2 || !app.config.norg2ApiKey || !app.config.norg2ConsumerId) {
        return;
    }
    // only create task once an hour
    if (!lastCheckOnNode || lastCheckOnNode + HOUR < Date.now()) {
        lastCheckOnNode = Date.now();
        libs.task.submit({
            description: 'Check norg for office information',
            task: () => {
                libs.tools.runInContext(undefined, () => {
                    checkForRefresh();
                });
            },
        });
    }
};

function checkForRefresh () {
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
                isRefreshing: false,
            },
        });
    }

    // we need to refresh the office information from norg2 if it has never run, or it's more than a day since last time
    let needRefresh = false;
    const lastRefresh = parseInt(officeInformation.data.lastRefresh);
    if (isNaN(lastRefresh)) {
        needRefresh = true;
    } else if (lastRefresh + DAY < Date.now()) {
        needRefresh = true;
    }

    // stop refresh if it's already refreshing
    if (officeInformation.data.isRefreshing === true) {
        needRefresh = false;
    }

    if (needRefresh) {
        // set isRefreshing true so only cluster node runs this
        setIsRefreshing(navRepo, true);

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

            libs.content.publish({
                keys: ['/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontakt-oss/kontorer'],
                sourceBranch: 'draft',
                targetBranch: 'master',
                includeDependencies: true,
            });
        } catch (e) {
            log.info('FAILED TO GET OFFICE INFORMATION FROM NORG2');
            log.info(e);
        }

        // set isRefreshing to false since we're done refresing office information
        setIsRefreshing(navRepo, false, Date.now());
    }
};

function setIsRefreshing (navRepo, isRefreshing, lastRefresh) {
    navRepo.modify({
        key: '/officeInformation',
        editor: o => {
            if (lastRefresh) {
                o.data.lastRefresh = lastRefresh;
            }
            o.data.isRefreshing = isRefreshing;
            return o;
        },
    });
}

function refreshOfficeInformation (officeInformationList) {
    // find all existing offices
    const officeFolder = libs.content.get({
        key: '/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontakt-oss/kontorer',
    });

    const existingOffices = libs.content.getChildren({
        key: officeFolder._id,
        count: 2000,
    }).hits;

    const officesInNorg = {
        // map over offices in norg2, so we can delete old offices
    };

    // update office information or create new
    officeInformationList.forEach(officeInformation => {
        // ignore closed offices
        if (officeInformation.enhet.status !== 'Nedlagt') {
            // check if the office already exists
            let existingOffice = existingOffices.filter(o => {
                if (o.data && o.data.enhet && o.data.enhet.enhetId) {
                    return o.data.enhet.enhetId === officeInformation.enhet.enhetId;
                }
                return false;
            })[0];
            if (existingOffice) {
                log.info('UPDATE :: ' + officeInformation.enhet.enhetId);
                libs.content.modify({
                    key: existingOffice._id,
                    editor: o => {
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
        log.info('DELETE :: ' + existingOffice._id);
        let enhetId;
        if (existingOffice && existingOffice.data && existingOffice.data.enhet && existingOffice.data.enhet.enhetId) {
            enhetId = existingOffice.data.enhet.enhetId;
            log.info('ENHET :: ' + enhetId);
        }
        if (!officesInNorg[enhetId]) {
            libs.content.delete({
                key: existingOffice._id,
            });
        }
    });
}

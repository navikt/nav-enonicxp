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

/**
 * @description tries to find an id based on the url
 * @param url
 * @returns {{external: boolean, invalid: boolean, refId: string|null, pathTo: string|null}}
 */
function getIdFromUrl(urlParam, skipNavRepo = false) {
    let url = urlParam;
    const ret = {
        external: true,
        invalid: false,
        refId: null,
        pathTo: null,
        replaceUrl: null,
    };
    url = url.toLowerCase();
    if (url.indexOf('/') === 0) {
        url = 'http://www.nav.no' + url;
    }
    if (url.indexOf('https://') !== -1 || url.indexOf('http://') !== -1) {
        // check link import
        if (!skipNavRepo) {
            const navRepo = getNavRepo();
            const links = navRepo.get('/links');
            if (links) {
                const match = links.data.links.filter((l) => l.url.toLowerCase() === url)[0];
                if (match) {
                    // check if the new path is an internal path or a replacement for an external url
                    if (match.newPath.indexOf('http') === 0) {
                        ret.external = true;
                        ret.replaceUrl = match.newPath;
                        return ret;
                    }

                    const ref = libs.content.get({
                        key: match.newPath,
                    });
                    if (ref) {
                        ret.external = false;
                        ret.refId = ref._id;
                        ret.pathTo = ref._path;
                        return ret;
                    }
                }
            }
        }

        // try to find path based on url
        url = url.replace(':443', '');
        if (url.indexOf('https://www.nav.no/') === 0 || url.indexOf('http://www.nav.no/') === 0) {
            ret.external = false;
            url = decodeURIComponent(url);
            url = url.replace(/\+/g, '-');
            url = url.replace(/ /g, '-');
            url = url.replace(/,/g, '');
            url = url.replace(/å/g, 'a');
            url = url.replace(/ø/g, 'o');
            url = url.replace(/æ/g, 'ae');
            if (url.indexOf('?') > -1) {
                const urlSplitOnQuestionmark = url.split('?');
                if (urlSplitOnQuestionmark.length === 2) {
                    url = urlSplitOnQuestionmark[0];
                }
            }
            let cmsKey;
            if (url.indexOf('.cms') === url.length - 4) {
                url = url.replace('.cms', '');
                let urlSplit = url.split('.');
                let cms = urlSplit[urlSplit.length - 1];
                if (!parseInt(cms).isNaN()) {
                    urlSplit = url.split('/');
                    cms = urlSplit[urlSplit.length - 1];
                    cmsKey = cms;
                    url = url.replace('/' + cms, '');
                } else {
                    cmsKey = cms;
                    url = url.replace('.' + cms, '');
                }
            }
            if (url.indexOf('/_attachment/') !== -1) {
                const urlSplitOnAttachment = url.split('/_attachment/');
                cmsKey = urlSplitOnAttachment[urlSplitOnAttachment.length - 1];
            }
            let path = url.replace('https://', '/').replace('http://', '/');

            let c;
            if (cmsKey) {
                const hits = libs.content.query({
                    start: 0,
                    count: 10,
                    query: 'x.no-nav-navno.cmsContent.contentKey LIKE "' + cmsKey + '"',
                }).hits;
                if (hits.length === 1) {
                    c = hits[0];
                }
            }
            if (!c) {
                let count = 0;
                let useCount = false;
                while (count < 10 && !c) {
                    let testPath = path;
                    if (!useCount) {
                        useCount = true;
                    } else {
                        testPath += '_' + count;
                        count += 1;
                    }
                    c = libs.content.get({
                        key: testPath,
                    });
                    if (c) {
                        path = testPath;
                    }
                }
            }

            ret.pathTo = path;
            if (c) {
                ret.refId = c._id;
            } else {
                ret.invalid = true;
            }
        }
    }
    return ret;
}

module.exports = {
    getIdFromUrl,
    getNavRepo,
    runInContext,
    runInMasterContext,
};

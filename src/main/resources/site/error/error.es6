
const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    portal: require('/lib/xp/portal'),
    cache: require('/lib/cacheControll'),
    tools: require('/lib/migration/tools'),
};

// Handle 404
exports.handle404 = function (req) {
    // get path relative to www.nav.no site
    let path = '/www.nav.no' + (req.request.rawPath.split('/www.nav.no')[1]);
    // remove trailing /
    if (path[path.length - 1] === '/') {
        path = path.substr(0, path.length - 1);
    }

    let element;
    // redirect the user to /forsiden if the user is trying to reach www.nav.no/ directly
    if (path === '/www.nav.no') {
        element = libs.content.get({
            key: '/www.nav.no/forsiden',
        });
    }

    // get content
    const content = libs.content.get({
        key: path,
    });

    let contentExistsButHasNoTemplate = false;
    // if its an internal- or external-link, redirect the user
    if (content && (content.type === app.name + ':internal-link' || content.type === app.name + ':external-link')) {
        element = content;
    } else if (content) {
        // if the content has no template, and is not an intenral link or external link, send the user to 404, this should stop endless redirect loops
        contentExistsButHasNoTemplate = true;
    }

    // the content we are trying to hit doesn't exist, try to look for a redirect with the same name
    if (!element) {
        let isRedirect = path.split('/').length === 3;
        if (isRedirect) {
            const contentName = path.split('/').pop().toLowerCase();
            const redirects = libs.cache.getRedirects('redirects', undefined, req.branch, function () {
                return libs.content.getChildren({
                    key: '/redirects',
                    start: 0,
                    count: 10000,
                }).hits;
            });

            for (let i = 0; i < redirects.length; i += 1) {
                const el = redirects[i];
                if (el.displayName.toLowerCase() === contentName) {
                    if (el.type === app.name + ':internal-link' || el.type === app.name + ':external-link') {
                        element = el;
                        break;
                    }
                }
            }
        } else if (!contentExistsButHasNoTemplate) {
            // try to convert from old url style to new
            const info = libs.tools.getIdFromUrl(
                path.toLowerCase()
                    .replace('/www.nav.no/', 'https://www.nav.no/')
                    .replace(/ - /g, '-')
                    .replace(/ + /g, '-')
                    .replace(/ /g, '-')
                    .replace(/ø/g, 'o')
                    .replace(/æ/g, 'ae')
                    .replace(/å/g, 'a'),
                true
            );
            if (info.invalid === false && info.refId) {
                const redirect = libs.portal.pageUrl({
                    id: info.refId,
                });
                if (redirect) {
                    return {
                        redirect,
                    };
                }
            }
        }
    }

    // if we found a matching redirect, send the user there
    if (element) {
        let redirect;
        if (element.type === app.name + ':external-link') {
            log.info(element.data.url);
            redirect = element.data.url;
        } else {
            redirect = libs.portal.pageUrl({
                id: element.data.target,
            });
        }
        if (redirect) {
            return {
                redirect,
            };
        }
    }

    // log error and send the user to a 404 page
    log.info(JSON.stringify(req, null, 4));
    const has404 = libs.content.get({
        key: '/www.nav.no/404',
    });
    let redirect;
    if (!has404) {
        // Try to create 404 page if not found
        redirect = create404page();
    } else {
        redirect = libs.portal.pageUrl({
            path: '/www.nav.no/404',
        });
    }
    if (redirect) {
        return {
            redirect,
        };
    }
    return {
        body: 'Missing',
        contentType: 'text/plain',
    };
};

function create404page () {
    return libs.context.run(
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
            const page = libs.content.create({
                name: '404',
                parentPath: '/www.nav.no',
                displayName: 'Oops, noe gikk galt',
                contentType: app.name + ':404',
                data: {
                    'errorMessage': 'Siden eller tjenesten finnes ikke eller er for tiden<br/>utilgjengelig. Vi beklager dette. Prøv igjen senere.',
                },
            });
            const res = libs.content.publish({
                keys: ['/www.nav.no/404'],
                sourceBranch: 'draft',
                targetBranch: 'master',
                includeDependencies: false,
            });
            if (res) {
                return libs.portal.pageUrl({
                    path: page,
                });
            } else {
                return null;
            }
        }
    );
}

// Handle all other errors - to avoid default error page with stack trace
exports.handleError = function (err) {
    return {
        contentType: 'text/html',
        body: `<html><body><h1>Error code ${err.status}</h1><p>${err.message}</p></body></html>`,
    };
};

const libs = {
    content: require('/lib/xp/content'),
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    cache: require('/lib/siteCache'),
    tools: require('/lib/migration/tools'),
    menu: require('/lib/menu-utils'),
    utils: require('/lib/nav-utils'),
};

const searchForRedirect = (path, req) => {
    const isRedirect = path.split('/').length === 3;
    let element = false;
    if (isRedirect) {
        const contentName = path.split('/').pop().toLowerCase();
        const redirects = libs.cache.getRedirects(
            'redirects',
            undefined,
            req.branch,
            () =>
                libs.content.getChildren({
                    key: '/redirects',
                    start: 0,
                    count: 10000,
                }).hits
        );

        for (let i = 0; i < redirects.length; i += 1) {
            const el = redirects[i];
            if (el.displayName.toLowerCase() === contentName) {
                if (
                    el.type === app.name + ':internal-link' ||
                    el.type === app.name + ':external-link'
                ) {
                    element = el;
                    break;
                }
            }
        }
    }
    return element;
};

const lookForExceptions = (path, content, req) => {
    let element;
    // redirect the user to /forsiden if the user is trying to reach www.nav.no/ directly
    if (path === '/www.nav.no') {
        element = libs.content.get({
            key: '/www.nav.no/forsiden',
        });
    }

    let contentExistsButHasNoTemplate = false;
    // if its an internal- or external-link, redirect the user
    if (
        content &&
        (content.type === app.name + ':internal-link' ||
            content.type === app.name + ':external-link')
    ) {
        element = content;
    } else if (content) {
        // if the content has no template, and is not an internal link or
        // external link, send the user to 404, this should stop endless
        // redirect loops
        contentExistsButHasNoTemplate = true;
    }

    // the content we are trying to hit doesn't exist, try to look for a redirect with the same name
    if (!element) {
        element = searchForRedirect(path, req);
        if (!element && !contentExistsButHasNoTemplate) {
            // try to convert from old url style to new
            const info = libs.tools.getIdFromUrl(
                path
                    .toLowerCase()
                    .replace('/www.nav.no/', 'https://www.nav.no/')
                    .replace(/ - /g, '-')
                    .replace(/\+/g, '-')
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
    return false;
};

const findPossibleSearchWords = (path) => {
    // initial implementation of finding search words from path
    // needs more work to be complete
    const potentialSearchwords = path.split('/');
    const partialNonos = ['www', '@'];

    const searchWords = potentialSearchwords.reduce((acc, item) => {
        const hasPartial = partialNonos.reduce((a, filter) => {
            return item.indexOf(filter) !== -1 || a;
        }, false);

        if (['no', 'person'].indexOf(item) === -1 && !hasPartial) {
            if (item.indexOf('-')) {
                item.split('-').forEach((subWord) => acc.push(subWord));
            } else {
                acc.push(item);
            }
        }
        return acc;
    }, []);
    return searchWords.filter((word) => word.length > 2);
};

// Handle 404
exports.handle404 = function (req) {
    // get path relative to www.nav.no site
    let path = '/www.nav.no' + req.request.rawPath.split('/www.nav.no')[1];
    // remove trailing /
    if (path[path.length - 1] === '/') {
        path = path.substr(0, path.length - 1);
    }

    // get content
    let content = libs.content.get({
        key: path,
    });

    // Check for exceptions
    // 1. redirect the user to /forsiden if the user is trying to reach www.nav.no/ directly
    // 2. if its an internal- or external-link, redirect the user
    // 3. the content we are trying to hit doesn't exist, try to look for a redirect with the same name
    // 4. check if the given urls is pre-migration
    const exceptions = lookForExceptions(path, content, req);
    if (exceptions) {
        return exceptions;
    }

    // log error and send the user to a 404 page
    log.info(`404: not found on: ${req.request.url}`);

    // go up the chain to find a valid content
    const myContent = path.split('/');
    let pathLength = myContent.length;
    while (pathLength > 1) {
        myContent.pop();
        content = libs.content.get({
            key: myContent.join('/'),
        });
        if (content) {
            if (
                content.type === `${app.name}:internal-link` ||
                content.type === `${app.name}:breaking-news`
            ) {
                content = libs.content.get({
                    key: content.data.target,
                });
            }
            if (content) {
                break;
            }
        } else {
            pathLength--;
        }
    }

    // fallback to norwegian frontpage
    if (!content) {
        log.error('Unable to find an exisiting parent in path, fallback to no frontpage');
        content = libs.content.get({
            key: '/www.nav.no/forsiden',
        });
    }

    const decUrl = app.config.decoratorUrl;
    const currentLocale = libs.utils.mapDecoratorLocale[content.language] || 'nb';
    const decParams = [
        {
            key: 'language',
            value: currentLocale,
        },
        {
            key: 'feedback',
            value: false,
        },
    ];

    const breadcrumbs = [
        { url: '/', title: content.language === 'en' ? 'Page not found' : 'Fant ikke siden' },
    ];
    const encodedBreadcrumbs = encodeURI(JSON.stringify(breadcrumbs));
    decParams.push({ key: 'breadcrumbs', value: encodedBreadcrumbs });

    const decEnv = decParams.map((p, i) => `${!i ? `?` : ``}${p.key}=${p.value}`).join('&');
    const view = resolve('error-page.html');

    const model = {
        decorator: {
            class: '',
            url: decUrl,
            env: decEnv,
            src: `${decUrl}/env${decEnv}`,
        },
        styleUrl: libs.portal.assetUrl({
            path: 'styles/navno.css',
        }),
        jsUrl: libs.portal.assetUrl({ path: 'js/navno.js' }),
        language: content.language,
        potentialSearchWords: findPossibleSearchWords(path).join(' '),
    };
    return {
        status: 404,
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model),
        headers: {
            'Cache-Control': 'must-revalidate',
        },
    };
};

// Handle all other errors - to avoid default error page with stack trace
exports.handleError = function (err) {
    return {
        contentType: 'text/html',
        body: `<html lang="no"><body><h1>Error code ${err.status}</h1><p>${err.message}</p></body></html>`,
    };
};

module.exports = searchForRedirect;


const libs = {
    content: require('/lib/xp/content'),
    portal: require('/lib/xp/portal'),
};

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

    // if its an internal- or external-link, redirect the user
    if (content && (content.type === app.name + ':internal-link' || content.type === app.name + ':external-link')) {
        element = content;
    }

    // the content we are trying to hit doesn't exist, try to look for a redirect with the same name
    const contentName = path.split('/').pop().toLowerCase();
    if (!element) {
        const redirects = libs.content.getChildren({
            key: '/redirects',
            start: 0,
            count: 10000,
        }).hits;

        for (let i = 0; i < redirects.length; i += 1) {
            const el = redirects[i];
            if (el.displayName.toLowerCase() === contentName) {
                if (el.type === app.name + ':internal-link' || el.type === app.name + ':external-link') {
                    element = el;
                    break;
                }
            }
        }
    }

    // if we found a matching redirect, send the user there
    if (element) {
        let redirect;
        if (element.type === app.name + ':external-link') {
            redirect = libs.portal.pageUrl(
                validateUrl(element.data.url.toLowerCase())
                    .andOr(stripProtocol)
                    .andOr(appendRoot)
                    .andOr(xpInfuse)
                    .endValidation
            );
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
    // TODO: create 404 page
    log.info(JSON.stringify(req, null, 4));
    return {
        body: 'Missing',
        contentType: 'text/plain',
    };
};

function stripProtocol (url) {
    return url.replace(/http[s]?:\/\/www\.nav\.no/, '');
}

function validateUrl (url) {
    const valid = url.startsWith('http') && url.indexOf('www.nav.no') === -1;

    function andOr (f) {
        if (!valid) {
            url = f(url);
        }
        return {
            andOr: andOr,
            endValidation: splitParams(url),
        };
    }
    return {
        andOr: andOr,
        endValidation: splitParams(url),
    };

    function splitParams (url) {
        return {
            path: url.split('?')[0],
            params: url.split('?')[1] ? url.split('?')[1].split('&').reduce((t, el) => {
                t[el.split('=')[0]] = el.split('=')[1];
            }, {

            }) : {

            },
        };
    }
}

function appendRoot (url) {
    if (!url.startsWith('/')) { url = '/' + url; }
    return '/www.nav.no' + url;
}
function xpInfuse (url) {
    url = url.replace(/\+/g, '-').replace(/%c3%b8/g, 'o').replace(/%c3%a5/g, 'a').replace(/%20/g, '-').replace(/%c3%a6/g, 'ae').replace(/(\.cms|\.\d+)/g, '');
    return url;
}

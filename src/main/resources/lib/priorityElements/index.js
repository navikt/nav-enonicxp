var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var http = require('/lib/http-client');
var tools = require('/lib/tools');

exports.handle = function(socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('convert-priority', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                convertPriority(socket);
            }
        );
    });
};

function convertPriority(socket) {
    var req = http.request({
        url: 'http://localhost:8080/status/osgi.bundle',
        contentType: 'application/json'
    });
    // log.info(JSON.stringify(JSON.parse(req.body), null, 4));
    var hasSearch =
        req.status === 200 &&
        JSON.parse(req.body).bundles.reduce(function(t, el) {
            return t || el.name === 'navno.nav.no.search';
        }, false);
    if (!hasSearch) return socket.emit('convert-complete', 'Nav Search unavailable');
    var priorities = content.get({ key: '/content/sok/nav-no/prioritert/generelle' });

    var xpPri = content.get({
        key: '/www.nav.no/prioriterte-elementer'
    });
    if (!xpPri) {
        content.create({
            displayName: 'prioriterte-elementer',
            parentPath: '/www.nav.no/',
            contentType: 'base:folder',
            data: {}
        });
    }
    var xpPriExternal = content.get({
        key: '/www.nav.no/prioriterte-elementer-eksternt'
    });

    if (!xpPriExternal) {
        content.create({
            displayName: 'prioriterte-elementer-eksternt',
            parentPath: '/www.nav.no/',
            contentType: 'base:folder',
            data: {}
        });
    }

    createData(priorities.data.forslag);
}

function createData(forslag) {
    forslag.forEach(function(el) {
        var info = tools.getIdFromUrl(el.lenke);
        if (info.external === false && info.invalid === false) {
            content.create({
                displayName: el.tittel,
                parentPath: '/www.nav.no/prioriterte-elementer/',
                contentType: 'navno.nav.no.search:search-priority',
                data: {
                    content: info.refId,
                    keywords: el.keywords.split(' ')
                }
            });
        } else {
            var split = el.lenke.split('.');
            var applicationName = [split[0], split[1], split[2] ? split[2].split('/')[0] : ''].join('.');
            content.create({
                displayName: el.tittel,
                parentPath: '/www.nav.no/prioriterte-elementer-eksternt/',
                contentType: 'navno.nav.no.search:search-api2',
                data: {
                    applicationName: applicationName,
                    keywords: el.keywords.split(' '),
                    url: el.lenke,
                    ingress: el.ingress
                }
            });
        }
    });
}

function createElements() {
    return {
        isNew: true,
        head: 'Konverter søkeelementer',
        body: {
            elements: [
                {
                    tag: 'p',
                    text: 'Konverter prioriterte elementer'
                },
                {
                    tag: 'button',
                    tagClass: ['button', 'is-info'],
                    action: 'convert-priority',
                    text: 'Konverter'
                },
                {
                    tag: 'p',
                    update: 'convert-complete'
                }
            ]
        }
    };
}

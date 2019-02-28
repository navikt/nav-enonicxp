var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var http = require('/lib/http-client');
exports.handle = function (socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('convert-priority', function () {
        context.run({
            repository: 'cms-repo',
            branch: 'draft',
            user: {
                login: 'pad',
                userStore: 'system'
            },
            principals: ["role:system.admin"]
        }, function () {
            convertPriority(socket);
        })

    });


}

function convertPriority(socket) {
    var req = http.request({
        url: 'http://localhost:8080/status/osgi.bundle',
        contentType: 'application/json'
    });
    log.info(JSON.stringify(JSON.parse(req.body), null, 4));
    var hasSearch = (req.status === 200 && JSON.parse(req.body).bundles.reduce(function (t, el) {
      return t || el.name === 'no.nav.navno.search'
    },false));
    if (!hasSearch) return socket.emit('convert-complete', 'Nav Search unavailable');
    var priorities = content.get({ key: '/content/sok/nav-no/prioritert/generelle'});


    var data = createData(priorities.data.forslag);

    log.info(JSON.stringify(data, null, 4));

    var xpPri = content.get({
        key: '/www.nav.no/prioriterte-elementer'
    });



    if (!xpPri) {
        //var p = content.create({

//        })
    }
}

function createData(forslag) {
    return forslag.map(function(el) {
        return {
            content: testPath(el),
            keywords: el.keywords.split(' ')
        }
    }).reduce(function (t, el) {
        if (el.content) t.push(el)
        return t;
    }, []);
}

function testPath(element) {
    if (element.dokumenttype === 'Skjema') return undefined;
    var r = element.lenke.replace(/http[s]?:\//, '');
    var isIntern = r.startsWith('/www.nav.no');
    if (isIntern) {
        var decoded = decodeURI(r).replace(/\+/g, '-').toLowerCase()
            .replace(/ø/g, 'o')
            .replace(/æ/g,'ae')
            .replace(/å/g, 'a')
            .replace(/%2c/, '')
            .replace(/(--\d*)$/g, '')
            .replace(/---/g, '-').replace(/.\d*.cms/, '');
        var c = content.get({key: decoded});
        if (c) return c._id;
        else {
            return undefined;
        }
    }
    else {
        log.info(r);
        log.info(element.keywords);
    }

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
    }
}

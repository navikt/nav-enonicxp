const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    http: require('/lib/http-client'),
    tools: require('/lib/migration/tools'),
};

exports.handle = function (socket) {
    const elements = createElements();
    socket.emit('newTask', elements);

    socket.on('convert-priority', () => {
        libs.tools.runInContext(socket, convertPriority);
    });
    socket.on('create-facets', () => {
        libs.tools.runInContext(socket, createFacets);
    });
};

function hasSearchApp () {
    const req = libs.http.request({
        url: 'http://localhost:2609/osgi.bundle',
        contentType: 'application/json',
    });
    // log.info(JSON.stringify(JSON.parse(req.body), null, 4));
    const hasSearch =
        req.status === 200 &&
        JSON.parse(req.body).bundles.reduce((t, el) => {
            return t || el.name === 'navno.nav.no.search';
        }, false);
    return hasSearch;
}

function convertPriority (socket) {
    const hasSearch = hasSearchApp();
    if (!hasSearch) {
        return socket.emit('convert-priority-message', 'Please install nav search app first');
    }
    const priorities = libs.content.get({
        key: '/content/sok/nav-no/prioritert/generelle',
    });

    const xpPri = libs.content.get({
        key: '/www.nav.no/prioriterte-elementer',
    });
    if (!xpPri) {
        libs.content.create({
            displayName: 'prioriterte-elementer',
            parentPath: '/www.nav.no/',
            contentType: 'base:folder',
            data: {

            },
        });
    }
    const xpPriExternal = libs.content.get({
        key: '/www.nav.no/prioriterte-elementer-eksternt',
    });

    if (!xpPriExternal) {
        libs.content.create({
            displayName: 'prioriterte-elementer-eksternt',
            parentPath: '/www.nav.no/',
            contentType: 'base:folder',
            data: {

            },
        });
    }

    createData(socket, priorities.data.forslag);
}

function createFacets (socket) {
    const hasSearch = hasSearchApp();
    if (!hasSearch) {
        return socket.emit('create-facets-message', 'Please install nav search app first');
    }
    socket.emit('create-facets-max', 2);

    libs.content.create({
        displayName: 'fasetter',
        parentPath: '/www.nav.no/',
        contentType: 'navno.nav.no.search:search-config2',
        data: {
            fasetter: [
                {
                    name: 'Sentralt Innhold',
                    rulekey: 'type',
                    rulevalue: '*" AND type NOT LIKE "media:*" AND _parentpath NOT LIKE "*lokalt*',
                    underfasetter: [
                        {
                            name: 'Informasjon',
                            rulekey: 'type',
                            rulevalue: '*:main-article',
                            className: 'informasjon',
                        },
                        {
                            name: 'Tjenester',
                            rulekey: 'type',
                            rulevalue: '*:search-api*',
                            className: 'tjenester',
                        },
                    ],
                },
                {
                    name: 'Nyheter',
                    rulekey: '_parentpath',
                    rulevalue: '*nyheter" AND parentpath NOT LIKE "*lokalt*',
                    underfasetter: [
                        {
                            name: 'Bedrift',
                            rulekey: '_parentpath',
                            rulevalue: '*bedrift*nyheter*',
                            className: 'nyheter',
                        },
                        {
                            name: 'Arbeid',
                            rulekey: '_parentpath',
                            rulevalue: '*arbeid*nyheter*',
                            className: 'nyheter',
                        },
                        {
                            name: 'Nav og samfunn',
                            rulekey: '_parentpath',
                            rulevalue: '*nav-og-samfunn*nyheter*',
                            className: 'nyheter',
                        },
                        {
                            name: 'Familie',
                            rulekey: '_parentpath',
                            rulevalue: '*familie/*',
                            className: 'nyheter',
                        },
                        {
                            name: 'Hjelpemidler',
                            rulekey: '_parenthpath',
                            rulevalue: '*hjelpemidler/*',
                            className: 'nyheter',
                        },
                        {
                            name: 'Pensjon',
                            rulekey: '_parentpath',
                            rulevalue: '*person/pensjon*',
                            className: 'nyheter',
                        },
                        {
                            name: 'Statistikk',
                            rulekey: '_parentpath',
                            rulevalue: '*statistikk*',
                            className: 'statistikk',
                        },
                    ],
                },
                {
                    name: 'Filer',
                    rulekey: 'type',
                    rulevalue: 'media:document',
                },
                {
                    name: 'Lokalt innhold',
                    rulekey: '_parentpath',
                    rulevalue: '*lokalt*',
                    underfasetter: [
                        {
                            name: 'Akershus',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/akershus*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Trøndelag',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/nord-trondelag" OR _parentpath LIKE "*lokalt/sor-trondelag*" OR _parentpath LIKE "*lokalt/trondelag*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Oppland',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/oppland*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Hedmark',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/hedmark*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Rogaland',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/rogaland*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Hordaland',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/hordaland*',
                            className: 'tjenester',
                        },
                        {
                            name: 'Nordland',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/nordland*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Troms',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/troms*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Finnmark',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/finnmark*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Buskerud',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/buskerud*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Møre og Romsdal',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/more-og-romsdal*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Nordmøre',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/nord-more*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Telemark',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/telemark*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Sogn og Fjordane',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/sogn-og-fjordane*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Vest Agder',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/vest-agder*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Aust-Agder',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/aust-agder*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Østfold',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/ostfold*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Vestfold',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/vestfold*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Oslo',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/oslo*',
                            className: 'lokalt',
                        },
                    ],
                },
            ],
        },
    });
    socket.emit('create-facets-value', 1);

    libs.content.create({
        displayName: 'søk',
        parentPath: '/www.nav.no/',
        contentType: 'no.nav.navno:searchresult',
        data: {

        },
    });
    socket.emit('create-facets-value', 2);
}

function createData (socket, forslag) {
    socket.emit('convert-priority-max', forslag.length);
    forslag.forEach((el, index) => {
        const info = libs.tools.getIdFromUrl(el.lenke);
        if (info.external === false && info.invalid === false) {
            libs.content.create({
                displayName: el.tittel,
                parentPath: '/www.nav.no/prioriterte-elementer/',
                contentType: 'navno.nav.no.search:search-priority',
                data: {
                    content: info.refId,
                    keywords: el.keywords.split(' '),
                },
            });
        } else {
            const split = el.lenke.split('.');
            const applicationName = [split[0], split[1], split[2] ? split[2].split('/')[0] : ''].join('.');
            libs.content.create({
                displayName: el.tittel,
                parentPath: '/www.nav.no/prioriterte-elementer-eksternt/',
                contentType: 'navno.nav.no.search:search-api2',
                data: {
                    applicationName: applicationName,
                    keywords: el.keywords.split(' '),
                    url: el.lenke,
                    ingress: el.ingress,
                },
            });
        }
        socket.emit('convert-priority-value', index + 1);
    });
}

function createElements () {
    return {
        isNew: true,
        head: 'Konverter søkeelementer',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Konverter prioriterte elementer',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'convert-priority',
                            progress: {
                                value: 'convert-priority-value',
                                max: 'convert-priority-max',
                                valId: 'convert-priority-val',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'convert-priority',
                            text: 'Konverter',
                        },
                        {
                            tag: 'p',
                            update: 'convert-priority-message',
                        },
                    ],
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Opprett fasetter og søk',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'create-facets',
                            progress: {
                                value: 'create-facets-value',
                                max: 'create-facets-max',
                                valId: 'create-facets-val',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'create-facets',
                            text: 'Opprett',
                        },
                        {
                            tag: 'p',
                            update: 'create-facets-message',
                        },
                    ],
                },
            ],
        },
    };
}

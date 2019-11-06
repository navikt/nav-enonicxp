const libs = {
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    http: require('/lib/http-client'),
    tools: require('/lib/migration/tools'),
    io: require('/lib/xp/io'),
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
    socket.on('import-form', () => {
        libs.tools.runInContext(socket, importForms);
    });
    socket.on('import-form2', () => {
        libs.tools.runInContext(socket, importFormsFromCsv);
    });
    socket.on('create-synonyms', () => {
        libs.tools.runInContext(socket, createSynonyms);
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
                    rulevalue: '*" AND type NOT LIKE "media:*" AND _parentpath NOT LIKE "*lokalt*" AND _parentpath NOT LIKE "*statistikk*',
                    underfasetter: [
                        {
                            name: 'Informasjon',
                            rulekey: 'type',
                            rulevalue: '*:main-article',
                            className: 'informasjon',
                        },
                        {
                            name: 'Kontor',
                            rulekey: 'type',
                            rulevalue: '*:office-information',
                            className: 'kontor',
                        },
                        {
                            name: 'Skjema',
                            rulekey: '_parentpath',
                            rulevalue: '*/www.nav.no/skjemaer*',
                            className: 'skjema',
                        },
                    ],
                },
                {
                    name: 'Nyheter',
                    rulekey: '_parentpath',
                    rulevalue: '*nyheter" AND _parentpath NOT LIKE "*lokalt*',
                    underfasetter: [
                        {
                            name: 'Arbeid',
                            rulekey: '_parentpath',
                            rulevalue: '*arbeid*nyheter*',
                            className: 'nyheter',
                        },
                        {
                            name: 'Bedrift',
                            rulekey: '_parentpath',
                            rulevalue: '*bedrift*nyheter*',
                            className: 'nyheter',
                        },
                        {
                            name: 'Statistikk',
                            rulekey: '_parentpath',
                            rulevalue: '*statistikk*',
                            className: 'statistikk',
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
                            name: 'Internasjonalt',
                            rulekey: '_parentpath',
                            rulevalue: '*internasjonalt/*',
                            className: 'nyheter',
                        },
                        {
                            name: 'Nav og samfunn',
                            rulekey: '_parentpath',
                            rulevalue: '*nav-og-samfunn*nyheter*',
                            className: 'nyheter',
                        },
                        {
                            name: 'Pensjon',
                            rulekey: '_parentpath',
                            rulevalue: '*person/pensjon*',
                            className: 'nyheter',
                        },
                        {
                            name: 'Sosiale tjenester',
                            rulekey: '_parentpath',
                            rulevalue: '*sosiale-tjenester/*',
                            className: 'nyheter',
                        },
                        {
                            name: 'English',
                            rulekey: 'language',
                            rulevalue: 'en" AND _parentpath LIKE "*/en/*',
                            className: 'nyheter',
                        },
                    ],
                },
                {
                    name: 'Filer',
                    rulekey: 'type',
                    rulevalue: 'media:*',
                },
                {
                    name: 'Statistikk',
                    rulekey: '_parentpath',
                    rulevalue: '*statistikk*" AND _parentpath NOT LIKE "*lokalt*" AND _parentpath NOT LIKE "*nyhet*" AND type NOT LIKE "media:*',
                },
                {
                    name: 'Lokalt innhold',
                    rulekey: '_parentpath',
                    rulevalue: '*lokalt*',
                    underfasetter: [
                        {
                            name: 'Agder',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/agder*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Aust-Agder',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/aust-agder*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Buskerud',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/buskerud*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Finnmark',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/finnmark*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Hedmark',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/hedmark*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Hordaland',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/hordaland*',
                            className: 'tjenester',
                        },
                        {
                            name: 'Innlandet',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/innlandet*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Møre og Romsdal',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/more-og-romsdal*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Nordland',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/nordland*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Oppland',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/oppland*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Oslo',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/oslo*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Rogaland',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/rogaland*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Sogn og Fjordane',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/sogn-og-fjordane*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Telemark',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/telemark*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Troms',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/troms*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Troms og Finnmark',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/troms-og-finnmark*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Trøndelag',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/nord-trondelag" OR _parentpath LIKE "*lokalt/sor-trondelag*" OR _parentpath LIKE "*lokalt/trondelag*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Vest-Agder',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/vest-agder*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Vestfold',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/vestfold*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Vestfold og Telemark',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/vestfold-og-telemark*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Vestland',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/vestland*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Vest-Viken',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/vest-viken*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Østfold',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/ostfold*',
                            className: 'lokalt',
                        },
                        {
                            name: 'Øst-Viken',
                            rulekey: '_parentpath',
                            rulevalue: '*lokalt/ost-viken*',
                            className: 'lokalt',
                        },
                    ],
                },
            ],
        },
    });
    socket.emit('create-facets-value', 1);

    libs.content.create({
        displayName: 'Søk',
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
                    className: el.dokumenttype.toLowerCase(),
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
                    className: el.dokumenttype.toLowerCase(),
                },
            });
        }
        socket.emit('convert-priority-value', index + 1);
    });
}

function createFormContent (form, count) {
    try {
        if (form.keywords) {
            const newForm = libs.content.create({
                displayName: form.displayName,
                name: count > 0 ? form.displayName + count : undefined,
                parentPath: '/www.nav.no/skjemaer/',
                contentType: 'navno.nav.no.search:search-api2',
                data: {
                    applicationName: 'https://www.nav.no/soknader',
                    keywords: form.keywords,
                    url: form.url,
                    ingress: form.description,
                    className: 'skjema',
                },
                language: form.language === 'nb' ? 'no' : form.language,
            });

            return newForm._id;
        } else {
            const newForm = libs.content.create({
                displayName: form.displayName,
                name: count > 0 ? form.displayName + count : undefined,
                parentPath: '/www.nav.no/skjemaer/',
                contentType: app.name + ':external-link',
                data: {
                    url: form.url,
                    description: form.description,
                },
                language: form.language === 'nb' ? 'no' : form.language,
            });

            return newForm._id;
        }
    } catch (e) {
        log.info(e);
        return createFormContent(form, count + 1);
    }
}

function importForms (socket) {
    const formFolder = libs.content.get({
        key: '/www.nav.no/skjemaer',
    });

    if (!formFolder) {
        libs.content.create({
            displayName: 'skjemaer',
            parentPath: '/www.nav.no/',
            contentType: 'base:folder',
            data: {

            },
        });
    }

    socket.emit('import-form-max', formImport.length);
    formImport.forEach((form, index) => {
        let newFormId = createFormContent(form, 0);

        let formNumber = form.displayName.split(' - ');
        formNumber = formNumber[formNumber.length - 1]; // last part of forms display name is the formNumber
        const oldForms = libs.content.query({
            query: `data.number = "${formNumber}"`,
        }).hits;

        if (oldForms && oldForms.length > 0) {
            oldForms.forEach(f => {
                const refs = libs.content.query({
                    query: `_references = "${f._id}"`,
                }).hits;
                refs.forEach(r => {
                    if ((r.language === 'en' && form.language === 'en') || (form.language === 'nb' && r.language !== 'en')) {
                        libs.tools.modify(r, newFormId, f._id);
                    }
                });
            });
        }
        socket.emit('import-form-value', index + 1);
    });
}

function importFormsFromCsv (socket) {
    // csv file containing new form urls
    const formsFile = libs.io.getResource('/lib/migration/forms.csv');
    if (formsFile.exists()) {
        const stream = formsFile.getStream();
        const lines = libs.io.readLines(stream);
        socket.emit('import-form2-max', lines.length);

        const forms = {
            // forms map
        };

        lines.forEach((line, index) => {
            if (index > 0) {
                const split = line.split(';');
                const usedInPath = split[0];
                const formId = split[1];
                const url = split[5];
                const language = split[3] || 'no';
                // create the new external-link to the form if it's not already made
                if (!forms[formId]) {
                    // find the old form and get the display name from the first form in that
                    const formsWithFormId = libs.content.query({
                        start: 0,
                        count: 100,
                        query: `data.number = "${formId}"`,
                    }).hits;
                    const oldForm = formsWithFormId[0];
                    let displayName;
                    const entries = oldForm.data.forms.form;
                    const entry = Array.isArray(entries) ? entries[0] : entries;
                    if (entry) {
                        displayName = entry.name + ' - ' + formId;
                    }
                    // find references to the old forms
                    let usedIn = [];
                    formsWithFormId.forEach(form => {
                        const hits = libs.content.query({
                            start: 0,
                            count: 1000,
                            query: `_references = "${form._id}"`,
                        }).hits;
                        usedIn = usedIn.concat(hits);
                    });
                    // cache away the id to the new and old form, as well as the references
                    forms[formId] = {
                        newForm: createFormContent(
                            {
                                displayName,
                                url,
                                language,
                            },
                            0
                        ),
                        oldForms: formsWithFormId.map(f => f._id),
                        usedIn: usedIn.map(u => u._path),
                    };
                }
                // add the reference from the csv as well
                if (forms[formId].usedIn.indexOf(usedInPath) === -1) {
                    forms[formId].usedIn.push(usedInPath);
                }
            }

            socket.emit('import-form2-value', index + 1);
        });
        // loop over all forms and update references
        for (let formId in forms) {
            const form = forms[formId];
            form.usedIn.forEach(path => {
                const c = libs.content.get({
                    key: path,
                });
                if (c) {
                    form.oldForms.forEach(oldFormId => {
                        libs.tools.modify(c, form.newForm, oldFormId);
                    });
                }
            });
        }
    } else {
        log.info('forms.csv not found');
    }
}

function createSynonyms () {
    const oldSynonyms = libs.content.get({
        key: '/content/sok/nav/synonymer/generelle',
    });

    if (
        libs.content.get({
            key: '/www.nav.no/synonymer',
        })
    ) {
        libs.content.delete({
            key: '/www.nav.no/synonymer',
        });
    }

    const synonyms = oldSynonyms.data.synonymerliste.map(oldSynonymString => {
        let synonym = [];
        let oldSynonyms = oldSynonymString.synonymord.split(', ');
        oldSynonyms.forEach(s => {
            if (s.split(',').length > 1) {
                synonym = synonym.concat(s.split(','));
            } else {
                synonym.push(s);
            }
        });
        return {
            synonym,
        };
    });
    libs.content.create({
        parentPath: '/www.nav.no/',
        displayName: 'Synonymer',
        contentType: 'navno.nav.no.search:synonyms',
        data: {
            synonyms,
        },
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
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Importer skjema',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'import-form',
                            progress: {
                                value: 'import-form-value',
                                max: 'import-form-max',
                                valId: 'import-form-val',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'import-form',
                            text: 'Importer',
                        },
                    ],
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Importer skjema 2',
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'import-form2',
                            progress: {
                                value: 'import-form2-value',
                                max: 'import-form2-max',
                                valId: 'import-form2-val',
                            },
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'import-form2',
                            text: 'Importer',
                        },
                    ],
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Opprett synonymer',
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'create-synonyms',
                            text: 'Opprett',
                        },
                    ],
                },
            ],
        },
    };
}

const formImport = [
    {
        displayName: 'Unemployment benefit',
        description:
            'Unemployment benefit is intended to partially compensate for your loss of income when you become unemployed. In order to become eligible for unemployment benefit, you must first register as a job seeker at NAV.',
        url: 'https://www.nav.no/soknader/en/person/arbeid/dagpenger',
        language: 'en',
        keywords: ['NAV 04-01.03', 'NAV 04-01.04', 'NAV 04-16.03', 'NAV 04-16.04', 'NAV 04-01.05', 'NAV 04-02.05'],
    },
    {
        displayName: 'Dagpenger',
        description:
            'For å få dagpenger må du først være registrert som arbeidssøker hos NAV. Du kan også ha krav på dagpenger hvis du er permittert, hvis arbeidsgiveren din er konkurs, hvis du nettopp har avsluttet verneplikt eller siviltjeneste, eller hvis du har vært skoleelev eller student og har hatt jobb ved siden av.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/dagpenger',
        language: 'nb',
        keywords: ['NAV 04-01.03', 'NAV 04-01.04', 'NAV 04-16.03', 'NAV 04-16.04', 'NAV 04-01.05', 'NAV 04-02.05'],
    },
    {
        displayName: 'Application for unemployment benefits - NAV 04-01.03',
        description:
            'You use this form when you are applying for compensation for loss of income due to unemployment, but not because you are laid off. NB: You must be registered as a job seeker first. If you are not registered, you can register here (Norwegian only).',
        url: 'https://www.nav.no/soknader/en/person/arbeid/dagpenger#NAV040103',
        language: 'en',
    },
    {
        displayName: 'Søknad om dagpenger (ikke permittert) - NAV 04-01.03',
        description: 'Gjelder kun hvis du skal søke om erstatning for tapt arbeidsinntekt. Du må være registrert som arbeidssøker.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/dagpenger#NAV040103',
        language: 'nb',
    },
    {
        displayName: 'Claim for unemployment benefits in the event of temporary lay-off - NAV 04-01.04',
        description:
            'You use this form when you are applying for compensation for loss of income because you are laid off. NB: You must be registered as a job seeker first. If you are not registered, you can register here (Norwegian only).',
        url: 'https://www.nav.no/soknader/en/person/arbeid/dagpenger#NAV040104',
        language: 'en',
    },
    {
        displayName: 'Søknad om dagpenger ved permittering - NAV 04-01.04',
        description: 'Du må være registrert som arbeidssøker hos NAV.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/dagpenger#NAV040104',
        language: 'nb',
    },
    {
        displayName: 'Søknad om gjenopptak av dagpenger - NAV 04-16.03',
        description:
            'Gjelder kun hvis du i løpet av de siste 52 ukene har hatt perioder uten dagpenger.\n\nGjelder kun hvis det er maks 52 uker siden du sist fikk dagpenger. Har du vært permittert eller i utdanning, kan det hende du i stedet skal søke via skjemaet NAV 04-01.03. Les mer om dine rettigheter og plikter.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/dagpenger#NAV041603',
        language: 'nb',
    },
    {
        displayName: 'Søknad om gjenopptak av dagpenger ved permittering - NAV 04-16.04',
        description:
            'Gjelder kun hvis du i løpet av de siste 52 ukene har hatt perioder uten dagpenger.\n\nDersom du i perioden uten dagpenger har vært i jobb i mer enn seks uker hos arbeidsgiveren du var permittert fra, må du bruke dette skjemaet.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/dagpenger#NAV041604',
        language: 'nb',
    },
    {
        displayName: 'Forenklet søknad om dagpenger etter endt periode med forskuttering av dagpenger ved konkurs mv. - NAV 04-01.05',
        description:
            'Dette gjelder kun dersom du har fått dagpenger etter en konkurs. Du må være registrert som arbeidssøker hos NAV. Du må levere forenklet søknad innen en uke etter at du har fått vedtak om at de forskutterte dagpenger opphører. Dersom du ikke holder deg til denne fristen, må du søke helt på nytt.\n\nHar du spørsmål om forenklet søknad, ta kontakt med NAV.\n\nHvis du har fått dagpenger på grunn av konkurs, kan du få innvilget dagpenger uten ny fullstendig søknad. Det er et vilkår at du melder deg som arbeidsledig hos NAV og leverer forenklet søknad innen én uke etter at du har mottatt vedtaket om at forskutterte dagpenger. Går det lengre tid, må fullstendig søknad fylles ut. Har du spørsmål om forenklet søknad, ta kontakt med NAV.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/dagpenger#NAV040105',
        language: 'nb',
    },
    {
        displayName: 'Søknad om attest PD U1/N-301 til bruk ved overføring av dagpengerettigheter - NAV 04-02.05',
        description:
            'Gjelder kun hvis du har opparbeidet deg rettigheter til dagpenger i Norge, og flytter til et annet EØS-land. PD U1 – attesten er nødvendig for å dokumentere rettighetene dine.\n\nDette skjemaet bruker du for å be om å få attest PD U1, om tidsrom som skal regnes med for ytelser ved arbeidsløshet du får når du flytter til et annet EØS-land. \n\nNB: Alle nødvendige vedlegg må legges ved for at søknaden skal kunne behandles.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/dagpenger#NAV040205',
        language: 'nb',
    },
    {
        displayName: 'Søknad om tiltakspenger - NAV 76-13.45',
        description: 'Dette skjemaet bruker du hvis du deltar i et arbeidsrettet tiltak og skal søke om stønad fra NAV.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/tiltakspenger#NAV761345',
        language: 'nb',
    },
    {
        displayName: 'Kjøreliste for godkjent bruk av egen bil - NAV 00-01.01',
        description:
            'Gjelder kun hvis du har vedtak om rett til å få dekket utgiftene til bruk av egen bil. Du skal oppgi antall dager og dokumenterte parkeringsutgifter.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/kjoreliste#NAV000101',
        language: 'nb',
    },
    {
        displayName: 'Søknad om godkjenning av utdanning med rett til dagpenger - NAV 04-06.05',
        description:
            'Som hovedregel har du ikke rett til dagpenger hvis du er skoleelev eller student, men det er noen unntak. Dersom du ønsker å beholde dagpenger mens du er skoleelev, må du søke om dette.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/Bistand-fra-NAV-for-a-komme --arbeid#NAV040605',
        language: 'nb',
    },
    {
        displayName: 'Registreringsskjema for tilskudd til utdanning NAV 76-07.10 - NAV 76-07.10',
        description:
            'Jeg mottar dagpenger, og ønsker kurs eller utdanning\n\nSom hovedregel har du ikke rett til dagpenger hvis du er skoleelev eller student, men det er noen unntak. Dersom du ønsker å beholde dagpenger mens du er skoleelev, må du søke om dette.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/Bistand-fra-NAV-for-a-komme --arbeid#NAV760710',
        language: 'nb',
    },
    {
        displayName: 'Oppfølging bistand - NAV 00-01.00',
        description:
            'Oppfølging i forbindelse med bistand fra NAV\n\nDersom du allerede er i dialog med NAV og skal sende inn kjøreliste, legeerklæring, jobblogg eller annen dokumentasjon i forbindelse med oppfølging, velger du lenken under her og går videre.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/Bistand-fra-NAV-for-a-komme --arbeid#NAV000100',
        language: 'nb',
    },
    {
        displayName: 'Søknad om dagpenger under etablering av egen virksomhet (utviklingsfase) - NAV 04-06.08',
        description: 'Dersom du allerede mottar dagpenger, kan du søke om å beholde disse under etablering av egen virksomhet i inntil 12 måneder.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/starte-egen-bedrift#NAV040608',
        language: 'nb',
    },
    {
        displayName: 'Søknad om arbeidsavklaringspenger under etablering av egen virksomhet (utviklingsfase) - NAV 11-13.08',
        description: 'Dersom du allerede mottar dagpenger, kan du søke om å beholde disse under etablering av egen virksomhet i inntil 12 måneder.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/starte-egen-bedrift#NAV111308',
        language: 'nb',
    },
    {
        displayName: 'Søknad om arbeidsavklaringspenger under etablering av egen virksomhet (oppstartfase) - NAV 11-13.09',
        description:
            'Dersom du allerede mottar arbeidsavklaringspenger, kan du søke om å beholde disse under etablering av egen virksomhet i en oppstartsfase inntil 3 måneder. Du må søke før bedriften har startet opp (må være ny virksomhet).',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/starte-egen-bedrift#NAV111309',
        language: 'nb',
    },
    {
        displayName: 'Søknad om utstedelse av attest PD U2 (tidligere E-303) - NAV 04-02.01',
        description:
            'Dersom du allerede mottar dagpenger, kan du søke om å få beholde dagpengene i inntil tre måneder mens du søker arbeid i et annet eøs-land. Du må ha mottatt dagpenger i Norge i minst fire uker før du søker.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/soke-jobb-i-utlandet#NAV040201',
        language: 'nb',
    },
    {
        displayName: 'Melding om inntekt - ventelønn - NAV 60-13.13',
        description: 'Du rapporterer bruttoinntekt per kalendermåned, dvs rapporterer for den måneden du har arbeidet.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/ventelonn#NAV601313',
        language: 'nb',
    },
    {
        displayName: 'Melding om biinntekt før fratredelse - NAV 60-13.09',
        description:
            'Jeg har fått innvilget ventelønn og har bi-inntekt fra perioden før oppsigelsen\n\nDu må ha hatt bi-inntekten før du mottok varsel om oppsigelse, for å ikke få redusert ventelønnen.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/ventelonn#NAV601309',
        language: 'nb',
    },
    {
        displayName: 'Søknad om ventelønn for ny periode - NAV 60-13.05',
        description: 'Jeg vil søke om ventelønn for en ny periode\n\nDin rett til ventelønn må være innvilget tidligere.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/ventelonn#NAV601305',
        language: 'nb',
    },
    {
        displayName: 'Søknad om lønnsgarantidekning - melding av lønnskrav m.v. til konkursboet - NAV 67-01.01',
        description:
            'For at du skal kunne søke om lønnsgaranti, må arbeidsgiveren din være konkurs. Du kan sjekke om arbeidsgiveren din er konkurs på Brønnøysundregistrene. Oppgi virksomhetens navn eller organisasjonsnummer. Her kan du også finne opplysninger om hvem som er bostyrer. Du kan eventuelt kontakte tingretten for å få disse opplysningene.\n\nDersom arbeidsgiveren din er konkurs og du ikke har fått deg ny jobb, må du være registrert som arbeidssøker hos NAV for å søke om dagpenger.\n\nDu må sende skjemaet med eventuelle vedlegg direkte til bostyrer.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/lonnsgaranti-arbeidsgiver-betaler-ikke-ut-lonn#NAV670101',
        language: 'nb',
    },
    {
        displayName: 'Forenklet søknad om dagpenger etter endt periode med forskuttering av dagpenger ved konkurs mv. - NAV 04-01.05',
        description:
            'Dette gjelder kun dersom du har fått dagpenger etter en konkurs. Du må være registrert som arbeidssøker hos NAV. Du må levere forenklet søknad innen en uke etter at du har fått vedtak om at de forskutterte dagpenger opphører. Dersom du ikke holder deg til denne fristen, må du søke helt på nytt.\n\nHar du spørsmål om forenklet søknad, ta kontakt med NAV.\n\nHvis du har fått dagpenger på grunn av konkurs, kan du få innvilget dagpenger uten ny fullstendig søknad. Det er et vilkår at du melder deg som arbeidsledig hos NAV og leverer forenklet søknad innen én uke etter at du har mottatt vedtaket om at forskutterte dagpenger. Går det lengre tid, må fullstendig søknad fylles ut. Har du spørsmål om forenklet søknad, ta kontakt med NAV.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/lonnsgaranti-arbeidsgiver-betaler-ikke-ut-lonn#NAV040105',
        language: 'nb',
    },
    {
        displayName: 'Søknad om arbeidsavklaringspenger - NAV 11-13.05',
        description:
            'Du kan søke om AAP dersom du har behov for medisinsk behandling eller tiltak som skal hjelpe deg tilbake i arbeid. AAP skal sikre deg inntekt i perioder hvor du, på grunn av sykdom eller skade, har behov for hjelp fra NAV for å komme i arbeid.\n\nOBS! Du må først registrere deg som arbeidssøker før du kan søke om arbeidsavklaringspenger. ',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/arbeidsavklaringspenger#NAV111305',
        language: 'nb',
    },
    {
        displayName: 'Oppfølging arbeidsavklaring - NAV 00-02.00',
        description:
            'Bruk lenken nedenfor hvis du enten mottar tilleggsstønader og skal sende inn kjøreliste, eller hvis du mottar arbeidsavklaringspenger og skal sende inn annen dokumentasjon for å følge opp saken din.\n\nDisse vedleggene bruker du i forbindelse med arbeidsavklaringspenger.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/arbeidsavklaringspenger#NAV000200',
        language: 'nb',
    },
    {
        displayName: 'Søknad om gjenopptak av arbeidsavklaringspenger - NAV 11-13.06',
        description: 'Dette gjelder kun hvis du har fått arbeidsavklaringspenger før og det er mindre enn 52 uker siden du sist fikk arbeidsavklaringspenger.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/arbeidsavklaringspenger#NAV111306',
        language: 'nb',
    },
    {
        displayName: 'Søknad om å beholde arbeidsavklaringspenger under opphold i utlandet - NAV 11-03.07',
        description: 'Jeg vil søke om å få beholde arbeidsavklaringspengene mens jeg oppholder med i utlandet.',
        url: 'https://www.nav.no/soknader/nb/person/arbeid/arbeidsavklaringspenger#NAV110307',
        language: 'nb',
    },
    {
        displayName: 'Bytte av hjelpemiddel - NAV 10-07.31',
        description:
            'Dette skjemaet bruker du hvis du trenger å bytte et hjelpemiddel.\n\nUtlån av nytt hjelpemiddel må være i samsvar med gjeldende regelverk og rammeavtaler i NAV. Hvis hjelpemiddelet er utslitt skal kommunal servicetekniker foreta teknisk vurdering før det bes om bytte.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/bytte-av-hjelpemiddel#NAV100731',
        language: 'nb',
    },
    {
        displayName: 'Bestilling av tekniske hjelpemidler - NAV 10-07.05',
        description:
            'Skjemaet skal kun brukes dersom du er godkjent bestiller og har fått opplæring i hjelpemiddelsentralenes bestillingsordning.\n\nHjelpemidlene som bestilles skal brukes av en person med vesentlig og varig nedsatt funksjon (over 2 år). Hjelpemidlene er nødvendige for å avhjelpe utfordringer med praktiske gjøremål eller for pleie i hjemmet og er vurdert opp mot andre rimeligere tiltak. Hjelpemidlene er hensiktsmessige for de problemene de er ment å løse. Hjelpemidlene skal ikke brukes til korttidsutlån eller til andre formål.\n\nSe oversikten til din lokale hjelpemiddelsentral for hvilke hjelpemidler som kan bestilles: www.nav.no/hjelpemiddelsentralene',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/bestillingsordningen#NAV100705',
        language: 'nb',
    },
    {
        displayName: 'Hjelp til vurdering og utprøving - NAV 10-07.20',
        description:
            'Jeg trenger hjelp til vurdering og utprøving av hjelpemidler. \n\nHvis du vet hva du vil søke om, bruker du i stedet skjema NAV 10-07.03.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/bevegelse#NAV100720',
        language: 'nb',
    },
    {
        displayName: 'Søknad om hjelpemidler - NAV 10-07.03',
        description:
            'Jeg har bevegelsesvansker og vil søke om et hjelpemiddel\n\nSkjemaet kan også brukes hvis du skal søke om tilskudd til rimelige hjelpemidler (småhjelpemidler).\n\nLes mer om hjelpemidler ved bevegelsesvansker\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/bevegelse#NAV100703',
        language: 'nb',
    },
    {
        displayName: 'Bil (motorkjøretøy)',
        description: 'Søker du  på vegne av barn eller er verge må du velge å gå videre ved å trykke på lenken "Jeg har ikke elektroisk ID"',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/bil',
        language: 'nb',
        keywords: ['NAV 10-07.41', 'NAV 10-07.17', 'NAV 10-07.40'],
    },
    {
        displayName: 'Søknad om spesialutstyr til motorkjøretøy - NAV 10-07.41',
        description:
            'Dette skjemaet bruker du hvis du skal søke om spesialutstyr til bil (motorkjøretøy).\n\nSkjema må være så fullstendig utfylt som mulig. Hvis du har andre opplysninger eller dokumenter som er av betydning for saken, kan disse legges ved søknaden. Mangelfullt utfylt skjema og/eller manglende dokumentasjon vil medføre lengre saksbehandlingstid.\n\nLes om hvordan NAV behandler personopplysninger i søknader\n\n\n\n\n\nSkjema må være så fullstendig utfylt som mulig. Hvis du har andre opplysninger eller dokumenter som er av betydning for saken, kan disse legges ved søknaden. Mangelfullt utfylt skjema og/eller manglende dokumentasjon vil medføre lengre saksbehandlingstid.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/bil#NAV100741',
        language: 'nb',
    },
    {
        displayName: 'Søknad om refusjon av reiseutgifter - bil - NAV 10-07.17',
        description:
            'Dette skjemaet skal du kun bruke hvis du har hatt reiseutgifter i forbindelse med utprøving av bil og/eller spesialutstyr til bil. Det samme gjelder ved reparasjon av spesialutstyr.\n\nFor refusjon av reiser til sykehus og andre tjenester som administreres av helseforetakene, gå til www.pasientreiser.no',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/bil#NAV100717',
        language: 'nb',
    },
    {
        displayName: 'Søknad om stønad til anskaffelse av motorkjøretøy - NAV 10-07.40',
        description:
            'Sjekk om du fyller vilkårene for stønad til bil før du går videre. Dersom du ikke fyller vilkårene, vil du få avslag på søknaden din. Les mer om vilkårene her:\n\nViktig informasjon om dine rettigheter og plikter\n\nSkjema må være så fullstendig utfylt som mulig. Mangelfullt utfylt skjema og/eller manglende dokumentasjon vil medføre lengre saksbehandlingstid. Ta derfor kontakt med ditt lokale NAV-kontor før du sender inn søknaden.\n\nDersom du søker om stønad til bil for barn under 18 år eller for en person som har verge, kan du ikke søke elektronisk. Da må du sende inn søknaden på papir. Du finner skjemaet og mer informasjon om vilkårene for å få stønad på www.nav.no/bil\n\n',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/bil#NAV100740',
        language: 'nb',
    },
    {
        displayName: 'Hjelp til vurdering og utprøving - NAV 10-07.20',
        description:
            'Jeg trenger hjelp til vurdering og utprøving av hjelpemidler.\n\nDette skjemaet bruker du hvis du er fagperson og trenger hjelp til vurdering eller utprøving.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/horsel#NAV100720',
        language: 'nb',
    },
    {
        displayName: 'Søknad om hjelpemidler - NAV 10-07.03',
        description: 'Jeg har hørselsvansker og vil søke om hjelpemidler Her finner du skjema for å søke om hjelpemidler ved hørselsvansker.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/horsel#NAV100703',
        language: 'nb',
    },
    {
        displayName: 'Søknad om tolk til døve, døvblinde og hørselshemmede - NAV 10-07.06',
        description:
            'Jeg vil søke om tolk for døve, døvblinde og hørselshemmede. \n\nDu kan først bestille tolk etter at du har fått innvilget tolkehjelp. Du bruker kun dette skjema når du søker for første gang, eller hvis behovet ditt har endret seg.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/horsel#NAV100706',
        language: 'nb',
    },
    {
        displayName: 'Søknad om høreapparat/tinnitusmaskerer/tilleggsutstyr - NAV 10-07.08',
        description:
            'Jeg vil søke om høreapparat eller tinnitusmaskerer\n\nGjelder kun hvis du har nedsatt hørsel eller tinnitus og har behov for høreapparat, tinnitusmaskerer eller tilbehør til dette.\n\nSkjemaet fylles ut og sendes inn av øre-nese-hals-lege.\n\nLes mer om høreapparat og tinnitusmaskerer. ',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/horsel#NAV100708',
        language: 'nb',
    },
    {
        displayName: 'Søknad om stønad til tilpasningskurs - NAV 10-07.18',
        description:
            'Jeg vil søke om stønad til tilpasningskurs for syns- og hørselshemmede eller til opphold på folkehøyskole. Du må spesifisere hvilke kurs du søker stønad til.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/horsel#NAV100718',
        language: 'nb',
    },
    {
        displayName: 'Søknad om hjelpemidler - NAV 10-07.03',
        description:
            'Jeg vil søke om tilskudd til PC eller nettbrett. Du må gå på grunnskolen og ha spesifikke lese- og skrivevansker. Skolen din må dokumentere at PC eller nettbrett er en del av det pedagogiske opplegget ved skolen.Du kan også bruke dette skjemaet ved søknad om program for lese- og skrivestøtte.\n\n ',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/kommunikasjon-og-kognisjon#NAV100703',
        language: 'nb',
    },
    {
        displayName: 'Søknad om hjelpemidler - NAV 10-07.03',
        description:
            'Her finner du skjema for å søke om hjelpemidler ved vansker med å huske, planlegge og organisere aktiviteter, forstå tiden m.m.\n\nLes mer om hjelpemidler for kognitiv funksjonsnedsettelse',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/kommunikasjon-og-kognisjon#NAV100703',
        language: 'nb',
    },
    {
        displayName: 'Søknad om hjelpemidler - NAV 10-07.03',
        description: 'Jeg vil søke om hjelpemidler fordi jeg har språk- eller talevansker. ',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/kommunikasjon-og-kognisjon#NAV100703',
        language: 'nb',
    },
    {
        displayName: 'Hjelp til vurdering og utprøving - NAV 10-07.20',
        description:
            'Jeg trenger hjelp til vurdering og utprøving av hjelpemidler. \n\nHvis du vet hva du vil søke om, bruker du i stedet skjema NAV 10-07.03.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/kommunikasjon-og-kognisjon#NAV100720',
        language: 'nb',
    },
    {
        displayName: 'Ortopediske hjelpemidler - NAV 10-07.10',
        description:
            'Gjelder kun hvis du skal søke om protese, ortose, fotseng eller ortopedisk fottøy. Skjemaet fylles ut av legespesialist eller sykehuslege.\n\nLes mer om ortopediske hjelpemidler',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/ortopediske-hjelpemidler#NAV100710',
        language: 'nb',
    },
    {
        displayName: 'Ortopediske hjelpemidler - Søknad om fornyelse - NAV 10-07.11',
        description:
            'Gjelder kun hvis legeerklæringen fra den opprinnelige søknaden fremdeles er gyldig.\n\nSkjemaet fylles ut av ortopediingeniør.\n\nTa kontakt med NAV dersom du har spørsmål om fornyelse.\n\nLes mer om fornyelse av ortopedisk hjelpemiddel',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/ortopediske-hjelpemidler#NAV100711',
        language: 'nb',
    },
    {
        displayName: 'Parykk/øyeprotese/ansiktsdefektprotese/spesial-BH/brystprotese/alminnelig fottøy ved ulik fotstørrelse - NAV 10-07.57',
        description:
            'Gjelder kun hvis du skal søke om\n- parykk eller hodeplagg\n- øyeprotese eller ansiktsdefektprotese\n- brystprotese eller spesialbrystholder\n- fottøy med ulike skonummer\n- refusjon av egenbetaling for fotseng eller ortopedisk fottøy på grunn av yrkesskade\n\nLes mer om disse hjelpemidlene.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/ortopediske-hjelpemidler#NAV100757',
        language: 'nb',
    },
    {
        displayName: 'Søknad om refusjon av reiseutgifter - ortopediske hjelpemidler m.m. - NAV 10-07.16',
        description:
            'Gjelder kun reiseutgifter fordi du skal ha\n\n- protese, ortose, fotseng eller ortopedisk fottøy\n- parykk\n- øyeprotese eller ansiktsdefektprotese\n- brystprotese\n- tilpasningskurs eller folkehøyskole\n- grunnmønster',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/ortopediske-hjelpemidler#NAV100716',
        language: 'nb',
    },
    {
        displayName: 'Hjelp til vurdering og utprøving - NAV 10-07.20',
        description:
            'Jeg trenger hjelp til vurdering og utprøving av hjelpemidler. \n\nHvis du vet hva du vil søke om, bruker du i stedet skjema NAV 10-07.03.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/syn#NAV100720',
        language: 'nb',
    },
    {
        displayName: 'Søknad om hjelpemidler - NAV 10-07.03',
        description: 'Jeg vil søke om hjelpemidler fordi jeg har synsvansker.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/syn#NAV100703',
        language: 'nb',
    },
    {
        displayName: 'Søknad om tolk til døve, døvblinde og hørselshemmede - NAV 10-07.06',
        description:
            'Jeg vil søke om tolk for døve, døvblinde og hørselshemmede. \n\nDu kan først bestille tolk etter at du har fått innvilget tolkehjelp. Du bruker kun dette skjema når du søker for første gang, eller hvis behovet ditt har endret seg.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/syn#NAV100706',
        language: 'nb',
    },
    {
        displayName: 'Søknad om stønad til tilpasningskurs - NAV 10-07.18',
        description:
            'Jeg vil søke om stønad til tilpasningskurs for syns- og hørselshemmede eller til opphold på folkehøyskole. Du må spesifisere hvilke kurs du søker stønad til.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/syn#NAV100718',
        language: 'nb',
    },
    {
        displayName: 'Søknad om dekning av utgifter til briller/kontaktlinser til barn under 18 år  - NAV 10-07.14',
        description:
            'Jeg er under 18 år og vil søke om stønad til briller eller kontaktlinser\n\nDu må sende søknaden innen seks måneder etter at du kjøpte brillene eller kontaktlinsene.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/syn#NAV100714',
        language: 'nb',
    },
    {
        displayName: 'Søknad om dekning av utgifter til irislinse - NAV 10-07.15',
        description: 'Jeg vil søke om Irislinse.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/syn#NAV100715',
        language: 'nb',
    },
    {
        displayName: 'Søknad om lese- og sekretærhjelp for blinde og svaksynte - NAV 10-07.30',
        description: 'Jeg vil søke om stønad til lese- og sekretærhjelp fordi jeg er blind eller svaksynt.\n\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/syn#NAV100730',
        language: 'nb',
    },
    {
        displayName: 'Regning for lese- og sekretærhjelp for blinde og svaksynte - NAV 10-07.09',
        description: 'Jeg vil sende regning for utført lese- og sekretærhjelp.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/syn#NAV100709',
        language: 'nb',
    },
    {
        displayName: ' Søknad om førerhund - NAV 10-07.50',
        description: 'Gjelder kun dersom du har så nedsatt syn at du ikke klarer å orientere deg på egen hånd.\n\nLes mer om stønad til førerhund',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/forerhund-og-servicehund#NAV100750',
        language: 'nb',
    },
    {
        displayName: 'Vurdering av ferdigheter innen mobilitet ved søknad om førerhund  - NAV 10-07.51',
        description: 'Gjelder kun for førerhundutvalget.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/forerhund-og-servicehund#NAV100751',
        language: 'nb',
    },
    {
        displayName: 'Vurdering av hensiktsmessighet og skikkethet ved søknad om førerhund - NAV 10-07.52',
        description: 'Gjelder kun for førerhundutvalget.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/forerhund-og-servicehund#NAV100752',
        language: 'nb',
    },
    {
        displayName: 'Søknad om dekning av ekstraordinære veterinærutgifter for førerhund - NAV 10-07.53',
        description: 'Gjelder kun dersom hunden er syk eller skadet. Du må alltid søke før du går til veterinær, bortsett fra når det er akutt.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/forerhund-og-servicehund#NAV100753',
        language: 'nb',
    },
    {
        displayName: 'Søknad om servicehund - NAV 10-07.54',
        description:
            'Gjelder kun personer som er avhengig av å få hjelp til praktiske gjøremål.\n\nLes mer om vilkårene og kriterier for tildeling av servicehund',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/forerhund-og-servicehund#NAV100754',
        language: 'nb',
    },
    {
        displayName: 'Søknad om refusjon av reiseutgifter - tekniske hjelpemidler - NAV 10-07.19',
        description:
            'Dette skjemaet skal du kun bruke hvis du har hatt reiseutgifter i forbindelse med utprøving eller reparasjon av tekniske hjelpemidler (hjelpemidler som formidles av hjelpemiddelsentralen).',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/reiseutgifter#NAV100719',
        language: 'nb',
    },
    {
        displayName: 'Søknad om refusjon av reiseutgifter - ortopediske hjelpemidler m.m. - NAV 10-07.16',
        description:
            'Gjelder kun reiseutgifter fordi du skal ha\n\n- protese, ortose, fotseng eller ortopedisk fottøy\n- parykk\n- øyeprotese eller ansiktsdefektprotese\n- brystprotese\n- tilpasningskurs eller folkehøyskole\n- grunnmønster',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/reiseutgifter#NAV100716',
        language: 'nb',
    },
    {
        displayName: 'Søknad om refusjon av reiseutgifter - bil - NAV 10-07.17',
        description:
            'Dette skjemaet skal du kun bruke hvis du har hatt reiseutgifter i forbindelse med utprøving av bil og/eller spesialutstyr til bil. Det samme gjelder ved reparasjon av spesialutstyr.\n\nFor refusjon av reiser til sykehus og andre tjenester som administreres av helseforetakene, gå til www.pasientreiser.no',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/reiseutgifter#NAV100717',
        language: 'nb',
    },
    {
        displayName: 'Søknad om hjelpemidler - NAV 10-07.03',
        description:
            'Jeg vil søke om tilskudd til PC eller nettbrett. Du må gå på grunnskolen og ha spesifikke lese- og skrivevansker. Skolen din må dokumentere at PC eller nettbrett er en del av det pedagogiske opplegget ved skolen.Du kan også bruke dette skjemaet ved søknad om program for lese- og skrivestøtte.\n\n ',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/diverse#NAV100703',
        language: 'nb',
    },
    {
        displayName: 'Søknad om stønad til tilpasningskurs - NAV 10-07.18',
        description:
            'Jeg vil søke om stønad til tilpasningskurs for syns- og hørselshemmede eller til opphold på folkehøyskole. Du må spesifisere hvilke kurs du søker stønad til.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/diverse#NAV100718',
        language: 'nb',
    },
    {
        displayName: 'Behov for hjelpemidler knyttet til individuell plan - NAV 10-07.23',
        description: 'Her finner du skjema for å søke om vedtak på behov for hjelpemidler som kommer frem i individuell plan.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/diverse#NAV100723',
        language: 'nb',
    },
    {
        displayName: 'Søknad om stønad til grunnmønster og søm etter grunnmønster  - NAV 10-07.55',
        description:
            'Jeg vil søke om stønad til grunnmønster og spesialsøm. Hvis du skal søke om stønad til grunnmønster eller refusjon av utgifter du har hatt til søm av klær etter grunnmønster, bruker du dette skjemaet.',
        url: 'https://www.nav.no/soknader/nb/person/hjelpemidler-og-tilrettelegging/diverse#NAV100755',
        language: 'nb',
    },
    {
        displayName: 'Melding om yrkesskade eller yrkessykdom som er påført under arbeid på norsk eller utenlandsk landterritorium - NAV 13-07.05',
        description: 'Jeg vil melde i fra om skade eller sykdom som skyldes jobben min i Norge eller et annet land.',
        url: 'https://www.nav.no/soknader/nb/bedrift/yrkesskade/paa-landterritorium#NAV130705',
        language: 'nb',
    },
    {
        displayName: 'Report of occupational injury or occupational illness sustained in connection with petroleum activities at sea - NAV 13-06.05',
        description: 'You use this form when you want to report an injury or disease which has occurred during petroleum activities at sea.',
        url: 'https://www.nav.no/soknader/en/bedrift/yrkesskade/ petroleumsvirksomhet-til-havs#NAV130605',
        language: 'en',
    },
    {
        displayName: 'Melding om yrkesskade eller yrkessykdom som er påført i forbindelse med petroleumsvirksomhet til havs - NAV 13-06.05',
        description: 'Jeg vil melde i fra om skade eller sykdom som skyldes jobben min i oljenæringen til havs.',
        url: 'https://www.nav.no/soknader/nb/bedrift/yrkesskade/ petroleumsvirksomhet-til-havs#NAV130605',
        language: 'nb',
    },
    {
        displayName:
            'Report on occupational injury / personal injury sustained in the course of duties on board ship or during fishing/catching - NAV 13-07.08',
        description:
            'You use this form when you want to report an injury or disease which has occurred during duties on board ship or during fishing/ hunting at sea',
        url: 'https://www.nav.no/soknader/en/bedrift/yrkesskade/skip-eller-fiske#NAV130708',
        language: 'en',
    },
    {
        displayName: 'Melding om yrkesskade eller yrkessykdom som er påført under tjeneste på skip eller under fiske/fangst - NAV 13-07.08',
        description: 'Jeg skal melde fra om skade eller sykdom mens jeg jobbet på skip eller drev med fiske/fangst.',
        url: 'https://www.nav.no/soknader/nb/bedrift/yrkesskade/skip-eller-fiske#NAV130708',
        language: 'nb',
    },
    {
        displayName: 'Melding om yrkesskade eller yrkessykdom som er påført eller oppstått under militær tjenestegjøring - NAV 13-08.05',
        description: 'Jeg skal melde fra om skade eller sykdom mens jeg tjenestegjorde i militæret.',
        url: 'https://www.nav.no/soknader/nb/bedrift/yrkesskade/militaere#NAV130805',
        language: 'nb',
    },
    {
        displayName: 'Melding om yrkesskade eller yrkessykdom påført elev/student - NAV 13-10.01',
        description: 'Jeg skal melde fra om skade eller sykdom mens jeg var elev eller student på skole, høgskole eller universitet.',
        url: 'https://www.nav.no/soknader/nb/bedrift/yrkesskade/student#NAV131001',
        language: 'nb',
    },
    {
        displayName: 'Søknad fra selvstendig næringsdrivende og frilansere om opptak i frivillig trygd med rett til særytelser ved yrkesskade - NAV 13-13.05',
        description:
            'Jeg vil søke om frivillig trygdeordning for å få rett til særytelser på grunn av yrkesskade.\n\nDette gjelder kun for selvstendig næringsdrivende.',
        url: 'https://www.nav.no/soknader/nb/bedrift/yrkesskade/frivillig-trygd#NAV131305',
        language: 'nb',
    },
    {
        displayName: 'Application for insurance during stay in Norway - NAV 02-07.05',
        description:
            'If you are going to work or stay in Norway and you are not a compulsory member, you can apply for voluntary membership in the national insurance scheme. For example, you may be a foreign citizen working for a foreign embassy, a people-to-people organization, on a ship registered outside the EEA, or a student who is studying inNorway for less than 12 months.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/opphold-eller-arbeid-i-norge#NAV020705',
        language: 'en',
    },
    {
        displayName: 'Søknad om å bli medlem i folketrygden under opphold i Norge - NAV 02-07.05',
        description:
            'Du kan søke om frivillig medlemskap hvis du skal oppholde deg i Norge under 12 måneder, for eksempel som student. Dette gjelder også deg som bor i Norge, men som skal jobbe på en utenlandsk ambassade, i en mellomfolkelig organisasjon eller på et utenlandskregistrert skip.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-i-norge#NAV020705',
        language: 'nb',
    },
    {
        displayName: 'A1 application – Determination of applicable social security legislation while working in the EEA or Switzerland - NAV 02-08.07',
        description:
            'Use this form if you need confirmation that Norwegian social security legislation applies to you if:\n\nYou live in another EEA country or Switzerland, and only work in Norway.\n\nYou are posted by your Norwegian employer to another EEA country or Switzerland. In this case, your employer must complete the form NAV 02- 08.08.\n\nYou work in two or more countries within the EEA area and/or Switzerland.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/opphold-eller-arbeid-i-norge#NAV020807',
        language: 'en',
    },
    {
        displayName: 'Søknad om A1 - Avklaring av trygdetilhørighet ved yrkesaktivitet innen EØS/Sveits - NAV 02-08.07',
        description:
            'Dette skjemaet bruker du for å søke om bekreftelse på at du er omfattet av norsk trygdelovgivning hvis:\n\nDu bor i et annet EØS-land eller Sveits, og arbeider kun i Norge.\n\nDu er utsendt av norsk arbeidsgiver til et annet EØS-land/Sveits.I så fall må vi også ha «Skjema for arbeidsgiver som sender arbeidstaker eller frilanser på midlertidig oppdrag i EØS/Sveits», NAV 02-08.08.\n\nDu arbeider i to eller flere land i EØS-området.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-i-norge#NAV020807',
        language: 'nb',
    },
    {
        displayName: 'Claim for cash-for-care benefit for parents of young children - NAV 34-00.08',
        description:
            'The child must be between one and two years old. Adopted children can not have started school yet. You can receive cash-for-care benefit from the calendar month after the child have turned one year old and for a maximum of for 11 months. The application must be sent one month prior to the time you are to be granted cash-for-care benefit.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/opphold-eller-arbeid-i-norge#NAV340008',
        language: 'en',
    },
    {
        displayName: 'Søknad om kontantstøtte til småbarnsforeldre - NAV 34-00.08',
        description:
            'Barnet må være mellom ett og to år. Adoptivbarn kan ikke ha begynt på skolen. Du kan tidligst få kontantstøtte fra måneden etter at barnet fyller ett år og kun i 11 måneder. Søknaden må sendes tidligst en måned før du ønsker å få kontantstøtte.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-i-norge#NAV340008',
        language: 'nb',
    },
    {
        displayName: 'Application for child benefit - NAV 33-00.07',
        description:
            'Child benefit is as a rule implemented automatically for children born in Norway. If you are not receiving child benefit, you use this form to apply for it.\n\n\n\n',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/opphold-eller-arbeid-i-norge#NAV330007',
        language: 'en',
    },
    {
        displayName: 'Søknad om ordinær barnetrygd - NAV 33-00.07',
        description: 'Du får vanligvis barnetrygden automatisk hvis barnet er født i Norge. Får du ikke barnetrygd, må du søke om dette.\n\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-i-norge#NAV330007',
        language: 'nb',
    },
    {
        displayName: 'Declaration form for Non-Norwegian Medical Certificates - NAV 08-09.06',
        description:
            'If you have a medical certificate from a doctor outsideNorway, you must complete this form, attach the medical certificate and send the documents to NAV.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/opphold-eller-arbeid-i-norge#NAV080906',
        language: 'en',
    },
    {
        displayName: 'Egenerklæring for utenlandske sykmeldinger - NAV 08-09.06',
        description: 'Dersom du har sykmelding fra lege utenfor Norge, må du fylle ut dette skjemaet, vedlegge sykmeldingen og sende til NAV.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-i-norge#NAV080906',
        language: 'nb',
    },
    {
        displayName: 'A1 application – Determination of applicable social security legislation while working in the EEA or Switzerland - NAV 02-08.07',
        description:
            'Use this form if you need confirmation that Norwegian social security legislation applies to you if:\n\nYou live in another EEA country or Switzerland, and only work in Norway.\n\nYou are posted by your Norwegian employer to another EEA country or Switzerland. In this case, your employer must complete the form NAV 02- 08.08.\n\nYou work in two or more countries within the EEA area and/or Switzerland.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/opphold-eller-arbeid-utenfor-norge#NAV020807',
        language: 'en',
    },
    {
        displayName: 'Søknad om A1 - Avklaring av trygdetilhørighet ved yrkesaktivitet innen EØS/Sveits - NAV 02-08.07',
        description:
            'Dette skjemaet bruker du for å søke om bekreftelse på at du er omfattet av norsk trygdelovgivning hvis:\n\nDu er utsendt av norsk arbeidsgiver til et annet EØS-land/Sveits.I så fall må vi også ha «Skjema for arbeidsgiver som sender arbeidstaker eller frilanser på midlertidig oppdrag i EØS/Sveits», NAV 02-08.08.\n\nDu arbeider i to eller flere land i EØS-området.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-utenfor-norge#NAV020807',
        language: 'nb',
    },
    {
        displayName: 'Søknad om å være omfattet av norsk trygdelovgivning under opphold innen EØS/Sveits - NAV 02-08.09',
        description:
            'Dette skjemaet kan du bruke hvis du skal bo eller oppholde deg i et annet EØS-land aller Sveits uten å arbeide.\n\nSkal du arbeide i denne perioden, må du bruke skjema NAV 02-08.07.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-utenfor-norge#NAV020809',
        language: 'nb',
    },
    {
        displayName: 'Søknad om medlemskap i folketrygden under opphold utenfor Norge - NAV 02-08.05',
        description: 'Dette skjemaet bruker du dersom du skal arbeide eller oppholde deg i land utenfor EØS-området.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-utenfor-norge#NAV020805',
        language: 'nb',
    },
    {
        displayName: 'Søknad om å beholde sykepenger under opphold i utlandet - NAV 08-09.07',
        description:
            'Denne søknaden bruker du hvis du ønsker å reise ut av Norge mens du er sykmeldt og du samtidig ønsker å beholde sykepengene. Du må sende søknaden før du reiser.\n\nSkal du avvikle lovbestemt ferie utenfor Norge, skal du ikke søke. I stedet krysser du av for ferie i søknaden om sykepenger som sendes etter at sykmeldingsperioden er over.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-utenfor-norge#NAV080907',
        language: 'nb',
    },
    {
        displayName: 'Søknad om å beholde arbeidsavklaringspenger under opphold i utlandet - NAV 11-03.07',
        description: 'Jeg vil søke om å få beholde arbeidsavklaringspengene mens jeg oppholder med i utlandet.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-utenfor-norge#NAV110307',
        language: 'nb',
    },
    {
        displayName: 'Søknad om attest PD U1/N-301 til bruk ved overføring av dagpengerettigheter - NAV 04-02.05',
        description:
            'Gjelder kun hvis du har opparbeidet deg rettigheter til dagpenger i Norge, og flytter til et annet EØS-land. PD U1 – attesten er nødvendig for å dokumentere rettighetene dine.\n\nDette skjemaet bruker du for å be om å få attest PD U1, om tidsrom som skal regnes med for ytelser ved arbeidsløshet du får når du flytter til et annet EØS-land. \n\nNB: Alle nødvendige vedlegg må legges ved for at søknaden skal kunne behandles.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-utenfor-norge#NAV040205',
        language: 'nb',
    },
    {
        displayName: 'Søknad om utstedelse av attest PD U2 (tidligere E-303) - NAV 04-02.01',
        description:
            'Dersom du allerede mottar dagpenger, kan du søke om å få beholde dagpengene i inntil tre måneder mens du søker arbeid i et annet eøs-land. Du må ha mottatt dagpenger i Norge i minst fire uker før du søker.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-utenfor-norge#NAV040201',
        language: 'nb',
    },
    {
        displayName: 'Leveattest / Life Certificate / Lebensbescheinigung / Certificat de vie / Certificado de fe de vida - NAV 21-03.05',
        description:
            'Jeg er pensjonist og skal sende leveattest til NAV\n\nHvis du bor utenfor Norge og mottar pensjon fra Norge, bruker du dette skjemaet når du skal sende leveattest til NAV. Les mer om leveattester.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/opphold-eller-arbeid-utenfor-norge#NAV210305',
        language: 'nb',
    },
    {
        displayName: 'Bank information form - NAV 95-00.15',
        description: 'If you live or work abroad and are entitled to benefits from NAV, the payments can be sent directly to your account abroad.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/kontoendringer#NAV950015',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger - NAV 95-00.15',
        description:
            'Dersom du bor i utlandet og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i utlandet.\n\nDette skjemaet bruker du hvis du vil utbetalinger fra NAV til konto i utlandet.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/kontoendringer#NAV950015',
        language: 'nb',
    },
    {
        displayName: 'Bank information form for Europe - NAV 95-00.05',
        description:
            'If you live or work in a European country and are entitled to benefits from NAV, the payments can be sent directly to your account in the European country.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/kontoendringer#NAV950005',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger i Europa - NAV 95-00.05',
        description:
            'Dersom du bor eller arbeider i et europeisk land og har rett til ytelser fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i det landet der du bor eller arbeider.\n\nDette skjemaet bruker du dersom du vil ha utbetalinger fra NAV til konto i Europa.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/kontoendringer#NAV950005',
        language: 'nb',
    },
    {
        displayName: 'Bank information form – Australia - NAV 95-00.09',
        description: 'If you live or work in Australia and are entitled to benefits from NAV, the payments can be sent directly to your account in Australia.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/kontoendringer#NAV950009',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger – Australia - NAV 95-00.09',
        description:
            'Dersom du bor i Australia og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i Australia.\n\nDette skjemaet bruker du hvis du vil utbetalinger fra NAV til konto i Australia.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/kontoendringer#NAV950009',
        language: 'nb',
    },
    {
        displayName: 'Bank information form – Canada - NAV 95-00.11',
        description: 'If you live or work in Canada and are entitled to benefits from NAV, the payments can be sent directly to your account in the Canada.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/kontoendringer#NAV950011',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger – Canada - NAV 95-00.11',
        description:
            'Dersom du bor i Canada og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i Canada.\n\nDette skjemaet bruker du hvis du vil utbetalinger fra NAV til konto i Canada.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/kontoendringer#NAV950011',
        language: 'nb',
    },
    {
        displayName: 'Bank information form – Mexico - NAV 95-00.17',
        description: 'If you live or work in Mexico and are entitled to benefits from NAV, the payments can be sent directly to your account in Mexico.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/kontoendringer#NAV950017',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger – Mexico - NAV 95-00.17',
        description:
            'Dersom du bor i Mexico og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i Mexico.\n\nDette skjemaet bruker du hvis du vil utbetalinger fra NAV til konto i Mexico.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/kontoendringer#NAV950017',
        language: 'nb',
    },
    {
        displayName: 'Bank information form – South Africa - NAV 95-00.19',
        description:
            'If you live or work in South Africa and are entitled to benefits from NAV, the payments can be sent directly to your account in South Africa.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/kontoendringer#NAV950019',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger – Sør-Afrika - NAV 95-00.19',
        description:
            'Dersom du bor i Sør-Afrika og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i Sør-Afrika.\n\nDette skjemaet bruker du hvis du vil utbetalinger fra NAV til konto i Sør-Afrika.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/kontoendringer#NAV950019',
        language: 'nb',
    },
    {
        displayName: 'Bank information form – USA - NAV 95-00.06',
        description: 'If you live or work in the USA and are entitled to benefits from NAV, the payments can be sent directly to your account in the USA.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/kontoendringer#NAV950006',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger – USA - NAV 95-00.06',
        description:
            'Dersom du bor i USA og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i USA.\n\nDette skjemaet bruker du hvis du vil ha utbetalinger fra NAV til konto i USA.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/kontoendringer#NAV950006',
        language: 'nb',
    },
    {
        displayName: 'Certification for detached workers from Norway to U.S.A - NAV 42-01.20',
        description:
            'If you are sent by your employer to work in the USA for a period of up to 5 years, your Norwegian employer must complete this form, in addition to the application form for membership in the Norwegian National Insurance Scheme while living abroad (form NAV 02-08.05).',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/certivicates-of-coverage#NAV420120',
        language: 'en',
    },
    {
        displayName: 'Attest for utsendte arbeidstakere fra Norge til USA - NAV 42-01.20',
        description: '',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/certivicates-of-coverage#NAV420120',
        language: 'nb',
    },
    {
        displayName: 'Certificate for continuing coverage under the Norwegian national insurance scheme - NAV 42-02.10',
        description:
            'If you are sent by your Norwegian employer to work in Canada for a period of up to 3 years, your employer must complete this form, in addition to the application form for membership in the Norwegian National Insurance Scheme while living abroad (form NAV 02-08.05).',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/certivicates-of-coverage#NAV420210',
        language: 'en',
    },
    {
        displayName:
            'Certificate of continuing coverage under the Norwegian National Insurance Scheme based on agreement on social security between the Kingdom of Norway and Australia - NAV 42-03.04',
        description:
            'If you are sent by your Norwegian employer to work in Australia for a period of up to 3 years, your employer must complete this form, in addition to the application form for membership in the Norwegian National Insurance Scheme while living abroad (form NAV 02-08.05).',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/certivicates-of-coverage#NAV420304',
        language: 'en',
    },
    {
        displayName: 'Certificate of Continuing liability to Norwegian legislation - NAV 42-02.12',
        description:
            'If you are sent by your Norwegian employer to work in Great Britain or Northern Ireland for a period of up to 3 years, your employer must complete this form, in addition to the application form for membership in the Norwegian National Insurance Scheme while living abroad (form NAV 02-08.05).',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/certivicates-of-coverage#NAV420212',
        language: 'en',
    },
    {
        displayName:
            'Certificate of continuing coverage under the Norwegian National Insurance Scheme based on agreement on social security between the Kingdom of Norway and the Republic of India - NAV 42-02.15',
        description:
            'If you are sent by your Norwegian employer to work in India with payment from the norwegian employer, your employer must complete the form Confirmation of membership in the Norwegian National Insurance Scheme in accordance with the Agreement on Social Insurance between Norway and India.',
        url: 'https://www.nav.no/soknader/en/person/til-eller-fra-norge/certivicates-of-coverage#NAV420215',
        language: 'en',
    },
    {
        displayName: 'Bekreftelse på medlemskap i folketrygden etter avtale om sosial trygd mellom Norge og India - NAV 42-02.15',
        description:
            'Bekreftelse på medlemskap i folketrygden etter avtale om sosial trygd mellom Norge og India - NAV 42-02.15 gjelder deg som er utsendt arbeidstaker til India med lønn fra norsk arbeidsgiver.',
        url: 'https://www.nav.no/soknader/nb/person/til-eller-fra-norge/certivicates-of-coverage#NAV420215',
        language: 'nb',
    },
    {
        displayName: 'Forsikring mot ansvar for sykepenger i arbeidsgiverperioden for små bedrifter - krav om refusjon - NAV 08-21.15',
        description:
            'Dette skjemaet bruker du som arbeidsgiver for å be om refusjon av sykepenger som du har utbetalt til arbeidstaker i arbeidsgiverperioden. Du må ha gyldig forsikring for små bedrifter for å få refundert sykepenger i arbeidsgiverperioden. Skjemaet bruker du kun for fravær i arbeidsgiverperioden, det vil si fra 4. til 16. fraværsdag.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/sykepenger-arbeidsgiverperioden#NAV082115',
        language: 'nb',
    },
    {
        displayName: 'Søknad om refusjon av reisetilskudd til arbeidsreiser - NAV 08-14.01',
        description:
            'For at arbeidsgiver skal kunne fremsette krav om refusjon, må arbeidstaker ha søkt og fått innvilget reisetilskudd fra NAV. Hvis du som arbeidsgiver dekker transportutgiftene til arbeidstaker, kan du søke om refusjon av dine utlegg.\n\nArbeidsgiver skal bruke dette skjemaet hver gang du sender inn dokumentasjon på dine utlegg.\n\nReisetilskuddet skal dekke nødvendige ekstra transportutgifter. Arbeidstakeren kan få reisetilskudd i stedet for sykepenger eller i kombinasjon med graderte sykepenger, jf folketrygdlovens § 8-14.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/reiseutgifter#NAV081401',
        language: 'nb',
    },
    {
        displayName: 'Refusjonskrav lønnstilskudd - NAV 76-13.20',
        description: 'Brukes av tiltaksarrangør som har fått tilsagn fra NAV om lønnstilskudd og som skal be om refusjon av tilsagnsbeløp.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/lønnstilskudd#NAV761320',
        language: 'nb',
    },
    {
        displayName: 'Refusjonskrav - inkluderingstilskudd - NAV 76-13.89',
        description: 'Brukes av arbeidsgiver for refusjon av inkluderingstilskudd. Kvittering må være vedlagt.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/inkluderingstilskudd#NAV761389',
        language: 'nb',
    },
    {
        displayName: 'Regning for lese- og sekretærhjelp for blinde og svaksynte - NAV 10-07.09',
        description: 'Jeg vil sende regning for utført lese- og sekretærhjelp.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/lese-og-sekretaerhjelp#NAV100709',
        language: 'nb',
    },
    {
        displayName: 'Refusjonskrav - mentor - NAV 76-13.85',
        description: 'Brukes av arbeidsgiver/ tiltaksarrangør som har fått tilsagn fra NAV om mentor og som skal be om refusjon av tilsagnsbeløp.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/mentor#NAV761385',
        language: 'nb',
    },
    {
        displayName: 'Refusjonskrav - Funksjonsassistanse - NAV 76-13.81',
        description: 'Dette skjemaet brukes av arbeidsgiver som har fått tilsagn fra NAV om funksjonsassisanse og som skal be om refusjon av tilsagnsbeløp.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/funksjonsassistanse#NAV761381',
        language: 'nb',
    },
    {
        displayName: 'Refusjonskrav – AFT og VTA i skjermet virksomhet - NAV 76-13.53',
        description:
            'Dette skjemaet brukes av tiltaksarrangør som har fått tilsagn fra NAV for arbeidsforberedende trening (AFT) og varig tiltrettelagt arbeid (VTA) i skjermet virksomhet. Skjemaet skal også benyttes for refusjonskrav for tiltakene avklaring i skjermet virksomhet og arbeidspraksis i skjermet virksomhet (APS), som begge er tiltak under utfasing.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/arbeidsforberedende-trening-og-vta#NAV761353',
        language: 'nb',
    },
    {
        displayName: 'Refusjonskrav - kvalifisering og tilrettelagt arbeid i AMB - NAV 76-13.60',
        description:
            'Dette skjemaet brukes av tiltaksarrangør som som har fått tilsagn fra NAV for kvalifisering eller tilrettelagt arbeid i arbeidsmarkedsbedrift og som skal be om refusjon av tilsagnsbeløp.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/kvalifisering-og-amb#NAV761360',
        language: 'nb',
    },
    {
        displayName: 'Refusjonskrav - kvalifisering og tilrettelagt arbeid i AMB - NAV 76-13.60',
        description:
            'Dette skjemaet brukes av tiltaksarrangør som har fått tilsagn fra NAV for varig tiltrettelagt arbeid (VTA) i ordinær virksomhet og som skal be om refusjon av tilsagnsbeløp.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/vta-ordinaer#NAV761360',
        language: 'nb',
    },
    {
        displayName: 'Tilskudd til bedriftsintern opplæring - NAV 76-13.26',
        description:
            'Brukes av bedrift som har fått tilsagn fra NAV om Bedriftsintern opplæring (BIO) og som skal be om refusjon av tilskuddsbeløp. \n\nLes mer om bedriftsintern opplæring ',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/bedriftsintern-opplaering#NAV761326',
        language: 'nb',
    },
    {
        displayName: 'Refusjonskrav - opplæring - NAV 76-13.18',
        description:
            'Dette skjemaet brukes av tiltaksarrangør som har fått tilsagn fra NAV for opplæringstiltak (AMO-kurs eller ordinær utdanning) og som skal be om refusjon av tilsagnsbeløp.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/opplaering#NAV761318',
        language: 'nb',
    },
    {
        displayName: 'Refusjonskrav - Arbeid med bistand - NAV 76-13.50',
        description:
            'Dette skjemaet brukes av tiltaksarrangør som har fått tilsagn fra NAV for arbeid med bistand og som skal be om refusjon av tilsagnsbeløp.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/arbeid-med-bistand#NAV761350',
        language: 'nb',
    },
    {
        displayName: 'Refusjonskrav for bruk av BHT i dialogmøter - NAV 08-07.17',
        description:
            'Dette skjemaet benyttes av IA- bedrift som har fått tilsagn fra NAV om BHT-honorar når bedriftshelsetjenesten har deltatt på dialogmøte for flere personer tilknyttet samme bedriftsnummer.\n\nSøknad om refusjon må sendes NAV senest to måneder etter tilsagnsperiodens utløp.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/bht-dialogmoeter#NAV080717',
        language: 'nb',
    },
    {
        displayName: 'Refusjonskrav – forebyggings- og tilretteleggingstilskudd og BHT-honorar for IA-virksomheter - NAV 08-07.14',
        description:
            'Dette skjemaet brukes av IA-bedrift som har fått tilsagn fra NAV om forebyggings- og tilretteleggingstilskudd og BHT-honorar og som skal be om refusjon av tilsagnsbeløp.',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/IA-virksomheter#NAV080714',
        language: 'nb',
    },
    {
        displayName:
            'Krav fra arbeidsgiveren om refusjon av sykepenger utbetalt i arbeidsgiverperioden til en arbeidstaker som er unntatt fra arbeidsgiveransvar - NAV 08-20.12',
        description:
            'Dette skjemaet bruker du hvis du skal kreve refusjon for sykepenger utbetalt i arbeidsgiverperioden.\n\nViktig informasjon om kronisk syk eller gravid arbeidstaker. ',
        url: 'https://www.nav.no/soknader/nb/bedrift/refusjoner/refusjon-sykdom-svangerskap#NAV082012',
        language: 'nb',
    },
    {
        displayName: 'Fremmøteliste ved deltakelse på arbeidstrening - NAV 76-13.16',
        description: 'Brukes av tiltaksarrangør for å dokumentere tiltaksdeltakelse i arbeidstrening.',
        url: 'https://www.nav.no/soknader/nb/bedrift/for-tiltaksarrangor/frammoteliste-arbeidstrening#NAV761316',
        language: 'nb',
    },
    {
        displayName: 'Fremmøteskjema ved deltakelse på kurs - NAV 76-13.48',
        description: 'Brukes av tiltaksarrangør for å dokumentere tiltaksdeltakelse på AMO-kurs og jobbklubb.',
        url: 'https://www.nav.no/soknader/nb/bedrift/for-tiltaksarrangor/fremmøteliste-kurs#NAV761348',
        language: 'nb',
    },
    {
        displayName: 'Underveis- og sluttevaluering av AMO-KURS - NAV 76-13.95',
        description: 'Dette skjemaet brukes for at tiltaksdeltakere skal kunne gjøre en evaluering av deltakelse på AMO-kurs.',
        url: 'https://www.nav.no/soknader/nb/bedrift/for-tiltaksarrangor/evaluering-amo#NAV761395',
        language: 'nb',
    },
    {
        displayName: 'Subsidies to employers',
        description: '...',
        url: 'https://www.nav.no/soknader/en/bedrift/tilskudd-og-tiltak/lonnstilskudd',
        language: 'en',
        keywords: ['NAV 76-13.02'],
    },
    {
        displayName: 'Lønnstilskudd',
        description: 'Søknaden skal fylles ut i samarbeid mellom arbeidsgiver, arbeidssøker og NAV.\n\nTrykk "Søk digitalt" for å komme til skjema på Altinn',
        url: 'https://www.nav.no/soknader/nb/bedrift/tilskudd-og-tiltak/lonnstilskudd',
        language: 'nb',
        keywords: ['NAV 76-13.02'],
    },
    {
        displayName: 'Avtale om oppstart av lønnstilskudd  - NAV 76-13.02',
        description:
            'Avtalen skal fylles ut i samarbeid mellom arbeidsgiver, arbeidssøker og NAV.\n\nSøk om lønnstilskudd digitalt via Altinn her.\n\nHvis du likevel vil søke på papir, velg Neste.',
        url: 'https://www.nav.no/soknader/nb/bedrift/tilskudd-og-tiltak/lonnstilskudd#NAV761302',
        language: 'nb',
    },
    {
        displayName: 'Inkluderingstilskudd',
        description: 'Søknaden skal fylles ut i samarbeid mellom arbeidsgiver, arbeidssøker og NAV.\n\nTrykk "Søk digitalt" for å komme til skjema på Altinn',
        url: 'https://www.nav.no/soknader/nb/bedrift/tilskudd-og-tiltak/inkluderingstilskudd',
        language: 'nb',
        keywords: ['NAV 76-13.88'],
    },
    {
        displayName: 'Søknad om inkluderingstilskudd  - NAV 76-13.88',
        description:
            'Søknaden skal fylles ut i samarbeid mellom arbeidsgiver, arbeidssøker og NAV.\n\nSøk om inkluderingstilskudd digitalt via Altinn her.\n\nHvis du likevel vil søke på papir, velg Neste.',
        url: 'https://www.nav.no/soknader/nb/bedrift/tilskudd-og-tiltak/inkluderingstilskudd#NAV761388',
        language: 'nb',
    },
    {
        displayName: 'Registreringsskjema for tiltaksarrangører - mentor  - NAV 76-13.84',
        description:
            'Søknaden skal fylles ut i samarbeid mellom arbeidsgiver, arbeidssøker og NAV. Trykk "Søk digitalt" for å komme til skjema på Altinn. Hvis du likevel vil søke på papir, trykk "Søk på papir". \n\n\n\n',
        url: 'https://www.nav.no/soknader/nb/bedrift/tilskudd-og-tiltak/mentor#NAV761384',
        language: 'nb',
    },
    {
        displayName: 'Avtale om arbeidstrening - NAV 76-13.05',
        description:
            'Brukes for å inngå en avtale om arbeidstrening mellom arbeidssøker, arbeidsgiver og NAV.\n\nDette tiltaket kan kombineres med inkluderingstilskudd.',
        url: 'https://www.nav.no/soknader/nb/bedrift/tilskudd-og-tiltak/arbeidstrening#NAV761305',
        language: 'nb',
    },
    {
        displayName: 'Registreringsskjema for arbeidsgiver - funksjonsassistanse - NAV 76-13.80',
        description:
            'Arbeidsgivere som har arbeidstakere med tilskudd fra NAV til funksjonsassistanse kan søke om inkluderingstilskudd til dekning av dokumenterte merutgifter til tilrettelegging av arbeidsplassen.\n\nLes mer om inkluderingstilskudd\n\nVelg skjema for inkluderingstilskudd',
        url: 'https://www.nav.no/soknader/nb/bedrift/tilskudd-og-tiltak/funksjonsassistanse#NAV761380',
        language: 'nb',
    },
    {
        displayName: 'Søknadsskjema for godkjenning som tiltaksarrangør av varig tilrettelagt arbeid i ordinær virksomhet - NAV 76-13.72',
        description:
            'Arbeidsgivere som har arbeidstakere på varig tilrettelagt arbeid i ordinær virksomhet kan søke om inkluderingstilskudd til dekning av dokumenterte merutgifter til tilrettelegging av arbeidsplassen.\n\nLes mer om inkluderingstilskudd\n\nVelg skjema for inkluderingstilskudd',
        url: 'https://www.nav.no/soknader/nb/bedrift/tilskudd-og-tiltak/vta-ordinaer#NAV761372',
        language: 'nb',
    },
    {
        displayName: 'Tilskudd til bedriftsintern opplæring - NAV 76-13.26',
        description:
            'Brukes av bedrift som har fått tilsagn fra NAV om Bedriftsintern opplæring (BIO) og som skal be om refusjon av tilskuddsbeløp. \n\nLes mer om bedriftsintern opplæring ',
        url: 'https://www.nav.no/soknader/nb/bedrift/tilskudd-og-tiltak/tilskudd-bedriftsintern-opplaering#NAV761326',
        language: 'nb',
    },
    {
        displayName: 'Avtale om arbeidstrening - NAV 76-13.05',
        description:
            'Brukes for å inngå en avtale om arbeidstrening mellom arbeidssøker, arbeidsgiver og NAV.\n\nDette tiltaket kan kombineres med inkluderingstilskudd.',
        url: 'https://www.nav.no/soknader/nb/bedrift/tilskudd-og-tiltak/tilskudd-bedriftsintern-opplaering#NAV761305',
        language: 'nb',
    },
    {
        displayName: 'Arbeidsplassvurdering - Rekvisisjon og rapportskjema - NAV 08-07.19',
        description:
            'NAV kan dekke utgiftene når en fysioterapeut eller ergoterapeut vurderer tilretteleggingsbehov på arbeidsplassen. Du kan få en arbeidsplassvurdering hvis du er ansatt i en bedrift uten bedriftshelsetjeneste og er sykmeldt eller står i fare for å bli sykmeldt.',
        url: 'https://www.nav.no/soknader/nb/bedrift/tilskudd-og-tiltak/arbeidsplassvurdering#NAV080719',
        language: 'nb',
    },
    {
        displayName: 'Bankkontonummer for refusjoner fra NAV til arbeidsgiver - NAV 25-01.15',
        description:
            'Kontonummer må endres elektronisk ved å benytte Altinn-tjenesten «Bankkontonummer for refusjoner fra NAV til arbeidsgiver (NAV 25-01.15)».\n\nDet er ikke lenger mulig å sende melding på papir.',
        url: 'https://www.nav.no/soknader/nb/bedrift/inntekt-og-trekk/bankkontonummer#NAV250115',
        language: 'nb',
    },
    {
        displayName:
            'Inntektsopplysninger for arbeidstaker som skal ha sykepenger, foreldrepenger, svangerskapspenger, pleie-/opplæringspenger og omsorgspenger - NAV 08-30.01',
        description:
            'Dette skjemaet bruker du til å opplyse NAV om arbeidstakers inntekter på sykepenger. Skjemaet bruker du når NAV skal utbetale ordinære sykepenger etter utløpet av arbeidsgiverperioden, som er fra 17. fraværsdag.\n\nFra 1. januar 2019 må arbeidsgiver sende digital inntektsmelding. Det er ikke lenger mulig å bruke papirskjemaet når arbeidstakers første fraværsdag er 1. januar 2019 eller senere. Denne kan tidligst sendes inn fire uker før fraværet starter.\n\nDersom første fraværsdag var i 2018 kan du sende inntektsmelding på papir om første fraværsdag var i 2018. Merk at skjemaet vil sendes i retur om det gjelder fravær som starter i 2019.\n\nHvor skal du sende inntektsskjemaet for sykepenger?\n\nFor at skjemaet skal komme raskt frem til de som skal behandle saken finner du frem til riktig adresse her.',
        url: 'https://www.nav.no/soknader/nb/bedrift/inntekt-og-trekk/sykepenger#NAV083001',
        language: 'nb',
    },
    {
        displayName:
            'Inntektsopplysninger for arbeidstaker som skal ha sykepenger, foreldrepenger, svangerskapspenger, pleie-/opplæringspenger og omsorgspenger - NAV 08-30.01',
        description:
            'Dette skjemaet bruker du til å opplyse NAV om arbeidstakers inntekter på foreldre- og svangerskapspenger.\n\nFra 1. januar 2019 må arbeidsgiver sende digital inntektsmelding. Det er ikke lenger mulig å bruke papirskjemaet når arbeidstakers første fraværsdag er 1. januar 2019 eller senere.\n\nDersom første fraværsdag var i 2018 kan du sende inntektsmelding på papir om første fraværsdag var i 2018. Merk at skjemaet vil sendes i retur om det gjelder fravær som starter i 2019.\n\nFor at skjemaet skal komme raskt frem til de som skal behandle saken, taster du inn arbeidstakers fødselsnummer og sender søknaden sammen med førstesidearket.',
        url: 'https://www.nav.no/soknader/nb/bedrift/inntekt-og-trekk/inntektsopplysninger-arbeidstaker#NAV083001',
        language: 'nb',
    },
    {
        displayName:
            'Inntektsopplysninger for arbeidstaker som skal ha sykepenger, foreldrepenger, svangerskapspenger, pleie-/opplæringspenger og omsorgspenger - NAV 08-30.01',
        description:
            'Dette skjemaet bruker du til å opplyse NAV om arbeidstakers inntekter på , pleie-/opplæringspenger og omsorgspenger.\n\nFra 1. januar 2019 må arbeidsgiver sende digital inntektsmelding. Det er ikke lenger mulig å bruke papirskjemaet når arbeidstakers første fraværsdag er 1. januar 2019 eller senere.\n\nDersom første fraværsdag var i 2018 kan du sende inntektsmelding på papir om første fraværsdag var i 2018. Merk at skjemaet vil sendes i retur om det gjelder fravær som starter i 2019.\n\nFor at skjemaet skal komme raskt frem til de som skal behandle saken, taster du inn arbeidstakers fødselsnummer og sender søknaden sammen med førstesidearket.',
        url: 'https://www.nav.no/soknader/nb/bedrift/inntekt-og-trekk/omsorgspenger#NAV083001',
        language: 'nb',
    },
    {
        displayName: 'Inntektsopplysninger for selvstendig næringsdrivende og/eller frilansere som skal ha sykepenger - NAV 08-35.01',
        description:
            'Dette skjemaet skal du fylle ut når du skal søke om sykepenger fra NAV. Du skal kun fylle ut og sende inn dette skjemaet én gang. Hvis du sender inn nye sykepengekrav (forlengelser) skal du ikke fylle ut skjemaet.\n\nHvis du i løpet av de siste fire årene har startet næringsvirksomhet eller fått en varig endring av arbeidssituasjonen/virksomheten, må du dokumentere dette. ',
        url: 'https://www.nav.no/soknader/nb/bedrift/inntekt-og-trekk/inntektsopplysninger-sykepenger#NAV083501',
        language: 'nb',
    },
    {
        displayName: 'Inntektsopplysninger for selvstendig næringsdrivende og frilansere som skal ha foreldrepenger eller svangerskapspenger - NAV 14-35.01',
        description:
            'Inntektsopplysninger for selvstendig næringsdrivende og/eller frilansere som skal ha foreldrepenger eller svangerskapspenger\n\nDette skjemaet skal du fylle ut når du skal søke om foreldrepenger eller svangerskapspenger fra NAV og ikke velger elektronisk innsending.Dette skjemaet skal du fylle ut når du skal søke om foreldrepenger eller svangerskapspenger fra NAV og ikke velger elektronisk innsending.\n\n\n\n',
        url: 'https://www.nav.no/soknader/nb/bedrift/inntekt-og-trekk/inntektsopplysninger-foreldrepenger-svangerskapspenger#NAV143501',
        language: 'nb',
    },
    {
        displayName:
            'Inntektsopplysninger for selvstendig næringsdrivende og/eller frilansere som skal ha omsorgs-, pleie- eller opplæringspenger - NAV 09-35.01',
        description:
            'Dette skjemaet skal du fylle ut når du skal søke om omsorgs-, opplærings- eller pleiepenger fra NAV.\n\nHvis du i løpet av de siste fire årene har startet næringsvirksomhet eller fått en varig endring av arbeidssituasjonen/virksomheten, må du dokumentere dette. \n\nHvis du er jordbruker, må du også legge ved RF-skjema 1224 fra skatteetaten som viser hvor mye av næringsinntekten som utgjør jordbruksinntekten.\n\nNB: En av legeerklæringene må følge søknaden.',
        url: 'https://www.nav.no/soknader/nb/bedrift/inntekt-og-trekk/inntektsopplysninger-omsorgs-opplaering-pleiepenger#NAV093501',
        language: 'nb',
    },
    {
        displayName:
            'Trekkopplysninger for arbeidstaker som skal ha: sykepenger, foreldrepenger, svangerskapspenger, pleie-/opplæringspenger og omsorgspenger - NAV 08-30.02',
        description:
            'Dette skjemaet brukes for å opplyse NAV om trekk hos arbeidstaker i forbindelse med utbetaling av sykepenger, foreldrepenger, svangerskapspenger eller pleie-/ opplærings- og omsorgspenger.',
        url: 'https://www.nav.no/soknader/nb/bedrift/inntekt-og-trekk/tekkopplysninger-arbeidstaker#NAV083002',
        language: 'nb',
    },
    {
        displayName: 'Forenklet søknad om dagpenger etter endt periode med forskuttering av dagpenger ved konkurs mv. - NAV 04-01.05',
        description:
            'Dette gjelder kun dersom du har fått dagpenger etter en konkurs. Du må være registrert som arbeidssøker hos NAV. Du må levere forenklet søknad innen en uke etter at du har fått vedtak om at de forskutterte dagpenger opphører. Dersom du ikke holder deg til denne fristen, må du søke helt på nytt.\n\nHar du spørsmål om forenklet søknad, ta kontakt med NAV.\n\nHvis du har fått dagpenger på grunn av konkurs, kan du få innvilget dagpenger uten ny fullstendig søknad. Det er et vilkår at du melder deg som arbeidsledig hos NAV og leverer forenklet søknad innen én uke etter at du har mottatt vedtaket om at forskutterte dagpenger. Går det lengre tid, må fullstendig søknad fylles ut. Har du spørsmål om forenklet søknad, ta kontakt med NAV.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/lonnsgaranti#NAV040105',
        language: 'nb',
    },
    {
        displayName: 'Søknad om lønnsgarantidekning - melding av lønnskrav m.v. til konkursboet - NAV 67-01.01',
        description:
            'For at du skal kunne søke om lønnsgaranti, må arbeidsgiveren din være konkurs. Du kan sjekke om arbeidsgiveren din er konkurs på Brønnøysundregistrene. Oppgi virksomhetens navn eller organisasjonsnummer. Her kan du også finne opplysninger om hvem som er bostyrer. Du kan eventuelt kontakte tingretten for å få disse opplysningene.\n\nDersom arbeidsgiveren din er konkurs og du ikke har fått deg ny jobb, må du være registrert som arbeidssøker hos NAV for å søke om dagpenger.\n\nDu må sende skjemaet med eventuelle vedlegg direkte til bostyrer.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/lonnsgaranti#NAV670101',
        language: 'nb',
    },
    {
        displayName: 'General authorisation - NAV 95-15.36',
        description:
            'To be certain that your personal information is not given to unauthorized personnel, we kindly ask you to fill in this form and return it to NAV as soon as possible.',
        url: 'https://www.nav.no/soknader/en/person/diverse/fullmaktskjema#NAV951536',
        language: 'en',
    },
    {
        displayName: 'Generell fullmakt - NAV 95-15.36',
        description:
            'For å sikre at ingen uvedkommende får opplysninger i saken din hos NAV, må du gi fullmakt til den eller de personene som du vil at skal ha innsyn i saken din. Du kan gi fullmakt ved å bruke dette skjemaet. Du bestemmer selv hva fullmakten skal omfatte, og hvor lenge den skal gjelde.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/diverse/fullmaktskjema#NAV951536',
        language: 'nb',
    },
    {
        displayName: 'Fullmakt i forbindelse med søknad om tekniske hjelpemidler - NAV 10-07.04',
        description: 'Jeg vil fylle ut en fullmakt ved søknad om tekniske hjelpemidler.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/fullmaktskjema#NAV100704',
        language: 'nb',
    },
    {
        displayName: 'Change bank account number',
        description:
            'You can change which bank account you want NAV to use by logging in to "Ditt NAV" (Norwegian only). This will save the change immediately.',
        url: 'https://www.nav.no/soknader/en/person/diverse/endre-opplysninger-om-bankkontonummer',
        language: 'en',
        keywords: ['NAV 95-20.00', 'NAV 95-00.05', 'NAV 95-00.09', 'NAV 95-00.11', 'NAV 95-00.17', 'NAV 95-00.19', 'NAV 95-00.06', 'NAV 95-00.15'],
    },
    {
        displayName: 'Endre opplysninger om bankkontonummer',
        description: 'Du kan endre hvilken bankkonto du vil at NAV skal bruke, ved å logge deg på Ditt NAV. Da lagres endringen umiddelbart.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/endre-opplysninger-om-bankkontonummer',
        language: 'nb',
        keywords: ['NAV 95-20.00', 'NAV 95-00.05', 'NAV 95-00.09', 'NAV 95-00.11', 'NAV 95-00.17', 'NAV 95-00.19', 'NAV 95-00.06', 'NAV 95-00.15'],
    },
    {
        displayName: 'Melding om nytt bankkontonummer - NAV 95-20.00',
        description:
            'Dersom du skal endre bankkontonummer, bruker du dette skjemaet for bankopplysninger i Norge. Gjelder for utbetalinger både fra NAV og HELFO.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/endre-opplysninger-om-bankkontonummer#NAV952000',
        language: 'nb',
    },
    {
        displayName: 'Bank information form for Europe - NAV 95-00.05',
        description:
            'If you live or work in a European country and are entitled to benefits from NAV, the payments can be sent directly to your account in the European country.',
        url: 'https://www.nav.no/soknader/en/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950005',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger i Europa - NAV 95-00.05',
        description:
            'Dersom du bor eller arbeider i et europeisk land og har rett til ytelser fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i det landet der du bor eller arbeider.\n\nDette skjemaet bruker du dersom du vil ha utbetalinger fra NAV til konto i Europa.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950005',
        language: 'nb',
    },
    {
        displayName: 'Bank information form – Australia - NAV 95-00.09',
        description: 'If you live or work in Australia and are entitled to benefits from NAV, the payments can be sent directly to your account in Australia.',
        url: 'https://www.nav.no/soknader/en/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950009',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger – Australia - NAV 95-00.09',
        description:
            'Dersom du bor i Australia og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i Australia.\n\nDette skjemaet bruker du hvis du vil utbetalinger fra NAV til konto i Australia.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950009',
        language: 'nb',
    },
    {
        displayName: 'Bank information form – Canada - NAV 95-00.11',
        description: 'If you live or work in Canada and are entitled to benefits from NAV, the payments can be sent directly to your account in the Canada.',
        url: 'https://www.nav.no/soknader/en/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950011',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger – Canada - NAV 95-00.11',
        description:
            'Dersom du bor i Canada og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i Canada.\n\nDette skjemaet bruker du hvis du vil utbetalinger fra NAV til konto i Canada.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950011',
        language: 'nb',
    },
    {
        displayName: 'Bank information form – Mexico - NAV 95-00.17',
        description: 'If you live or work in Mexico and are entitled to benefits from NAV, the payments can be sent directly to your account in Mexico.',
        url: 'https://www.nav.no/soknader/en/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950017',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger – Mexico - NAV 95-00.17',
        description:
            'Dersom du bor i Mexico og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i Mexico.\n\nDette skjemaet bruker du hvis du vil utbetalinger fra NAV til konto i Mexico.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950017',
        language: 'nb',
    },
    {
        displayName: 'Bank information form – South Africa - NAV 95-00.19',
        description:
            'If you live or work in South Africa and are entitled to benefits from NAV, the payments can be sent directly to your account in South Africa.',
        url: 'https://www.nav.no/soknader/en/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950019',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger – Sør-Afrika - NAV 95-00.19',
        description:
            'Dersom du bor i Sør-Afrika og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i Sør-Afrika.\n\nDette skjemaet bruker du hvis du vil utbetalinger fra NAV til konto i Sør-Afrika.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950019',
        language: 'nb',
    },
    {
        displayName: 'Bank information form – USA - NAV 95-00.06',
        description: 'If you live or work in the USA and are entitled to benefits from NAV, the payments can be sent directly to your account in the USA.',
        url: 'https://www.nav.no/soknader/en/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950006',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger – USA - NAV 95-00.06',
        description:
            'Dersom du bor i USA og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i USA.\n\nDette skjemaet bruker du hvis du vil ha utbetalinger fra NAV til konto i USA.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950006',
        language: 'nb',
    },
    {
        displayName: 'Bank information form - NAV 95-00.15',
        description: 'If you live or work abroad and are entitled to benefits from NAV, the payments can be sent directly to your account abroad.',
        url: 'https://www.nav.no/soknader/en/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950015',
        language: 'en',
    },
    {
        displayName: 'Skjema for bankopplysninger - NAV 95-00.15',
        description:
            'Dersom du bor i utlandet og har rett til ytelse fra NAV, kan NAV utbetale ytelsene direkte til din bankkonto i utlandet.\n\nDette skjemaet bruker du hvis du vil utbetalinger fra NAV til konto i utlandet.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/endre-opplysninger-om-bankkontonummer#NAV950015',
        language: 'nb',
    },
    {
        displayName: 'Tilleggstrekk skatt - NAV 95-20.02',
        description:
            'Dersom du ønsker ekstra skattetrekk, kan du søke om det her. Vi gjør oppmerksom på at dette er en frivillig avtale som gjelder ut inneværende år, eller inntil du selv sender skriftlig melding om stans. Ekstra skattetrekk vil gjelde alle måneder, også ordinære skattefrie måneder.\n\nØnsker du ekstra skattetrekk i pensjon, bestiller du det på Din Pensjon under din profil.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/endre-skattetrekk#NAV952002',
        language: 'nb',
    },
    {
        displayName: 'Oppfølging bistand - NAV 00-01.00',
        description:
            'Oppfølging i forbindelse med bistand fra NAV\n\nDersom du allerede er i dialog med NAV og skal sende inn kjøreliste, legeerklæring, jobblogg eller annen dokumentasjon i forbindelse med oppfølging, velger du lenken under her og går videre.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/oppfølging-kjorelister#NAV000100',
        language: 'nb',
    },
    {
        displayName: 'Oppfølging arbeidsavklaring - NAV 00-02.00',
        description:
            'Bruk lenken nedenfor hvis du enten mottar tilleggsstønader og skal sende inn kjøreliste, eller hvis du mottar arbeidsavklaringspenger og skal sende inn annen dokumentasjon for å følge opp saken din.\n\nDisse vedleggene bruker du i forbindelse med arbeidsavklaringspenger.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/oppfølging-kjorelister#NAV000200',
        language: 'nb',
    },
    {
        displayName: 'Melding om midlertidig postadresse i NAV - NAV 95-20.20',
        description:
            'Dette skjemaet bruker du hvis du vil endre adressen der du vil motta post i inntil et år. Du kan også melde endring av adresse direkte i selvbetjeningsløsningene på nav.no. Les mer om dette på siden det lenkes til nedenfor.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/endre-postadresse-midlertidig#NAV952020',
        language: 'nb',
    },
    {
        displayName: 'Cohabitation Amendment form - NAV 25-04.10',
        description:
            "You use this form to report starting or ending of a cohabitant relationship. You can also use the form to report changes in the cohabitant's income.",
        url: 'https://www.nav.no/soknader/en/person/diverse/samboerforhold#NAV250410',
        language: 'en',
    },
    {
        displayName: 'Endringsblankett for samboerskap  - NAV 25-04.10',
        description:
            'Dette skjemaet bruker du når du skal melde fra om inngåelse eller opphør av samboerskap. Du kan også bruke skjemaet til å melde fra om endring i samboers inntekt.',
        url: 'https://www.nav.no/soknader/nb/person/diverse/samboerforhold#NAV250410',
        language: 'nb',
    },
    {
        displayName: 'Arbeidsgivers meldeplikt til NAV ved masseoppsigelser, permitteringer uten lønn og innskrenking i arbeidstiden - NAV 76-08.03',
        description: 'Arbeidsgiver har meldeplikt til NAV ved masseoppsigelser, permitteringer uten lønn og innskrenkninger i arbeidstiden.',
        url: 'https://www.nav.no/soknader/nb/bedrift/permitteringer-oppsigelser-og-konkurs/masseoppsigelser#NAV760803',
        language: 'nb',
    },
    {
        displayName: 'Samleliste B for bostyrer - Den statlige lønnsgarantiordningen (Excel-versjon) - NAV 67-01.02',
        description: 'Samleliste B for innsendelse av søknader om lønnsgarantidekning.',
        url: 'https://www.nav.no/soknader/nb/bedrift/permitteringer-oppsigelser-og-konkurs/samlelist-excel#NAV670102',
        language: 'nb',
    },
    {
        displayName: 'Samleliste B for bostyrer - Den statlige lønnsgarantiordningen (PDF-versjon) - NAV 67-01.02',
        description: 'Samleliste B for innsendelse av søknader om lønnsgarantidekning.',
        url: 'https://www.nav.no/soknader/nb/bedrift/permitteringer-oppsigelser-og-konkurs/samleliste-pdf#NAV670102',
        language: 'nb',
    },
    {
        displayName: 'Opplysninger om boet og kravene (Den statlige lønnsgarantiordning) - NAV 67-01.03',
        description: 'Bostyrers oversendelsesbrev for søknader om lønnsgarantidekning.',
        url: 'https://www.nav.no/soknader/nb/bedrift/permitteringer-oppsigelser-og-konkurs/opplysninger-om-bo#NAV670103',
        language: 'nb',
    },
    {
        displayName: 'Bekreftelse på sluttårsak/nedsatt arbeidstid (ikke permittert) - NAV 04-08.03',
        description: 'Skjemaet fylles ut av arbeidsgiver når oppsagt arbeidstaker har behov for dokumentasjon i forbindelse med dagpengesøknad.',
        url: 'https://www.nav.no/soknader/nb/bedrift/permitteringer-oppsigelser-og-konkurs/sluttaarsak#NAV040803',
        language: 'nb',
    },
    {
        displayName: 'Bekreftelse på sluttårsak/nedsatt arbeidstid (ikke permittert) - NAV 04-08.03',
        description: 'Skjemaet fylles ut av arbeidsgiver når permittert arbeidstaker har behov for dokumentasjon i forbindelse med dagpengesøknad.',
        url: 'https://www.nav.no/soknader/nb/bedrift/permitteringer-oppsigelser-og-konkurs/permitteringsaarsak#NAV040803',
        language: 'nb',
    },
    {
        displayName: 'Forespørsel til arbeidsgiver i forbindelse med permittering - NAV 04-07.05',
        description:
            'Dette skjemaet brukes for å innhente dokumentasjon fra drøftelser med ansatte i forbindelse med permittering, samt navneliste over de permitterte.',
        url: 'https://www.nav.no/soknader/nb/bedrift/permitteringer-oppsigelser-og-konkurs/forespoersel-permittering#NAV040705',
        language: 'nb',
    },
    {
        displayName: 'Legeerklæring ved arbeidsuførhet - NAV 08-07.08',
        description: 'Legeerklæring ved arbeidsuførhet',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykemelding-lege/legeerklaering#NAV080708',
        language: 'nb',
    },
    {
        displayName: 'Vurdering av arbeidsmulighet / Sykmelding - NAV 08-07.04L',
        description:
            'Behandlere som ikke bruker elektronisk sykmelding, skal sende sykmeldingens del A til følgende adresse:\n\nNAV Skanning sykmelding del A\n\nPostboks 1411 Sentrum\n0109 Oslo\n\nFlere sykmeldinger kan sendes i samme konvolutt.\n\nSykmeldingens del D skal sendes til NAV Arbeid og ytelser. Det er pasientens bostedsfylke som avgjør hvilken adresse som skal benyttes. Se oversikt over adresser.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykemelding-lege/ordinaer#NAV080704L',
        language: 'nb',
    },
    {
        displayName: 'Vurdering av arbeidsmulighet/Sykmelding ved 7 uker - NAV 08-07.04P',
        description:
            'Behandlere som ikke bruker elektronisk sykmelding, skal sende sykmeldingens del A til følgende adresse:\n\nNAV Skanning sykmelding del A\n\nPostboks 1411 Sentrum\n0109 Oslo\n\nFlere sykmeldinger kan sendes i samme konvolutt.\n\nSykmeldingens del D skal sendes til NAV Arbeid og ytelser. Det er pasientens bostedsfylke som avgjør hvilken adresse som skal benyttes. Se oversikt over adresser.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykemelding-lege/7-uker#NAV080704P',
        language: 'nb',
    },
    {
        displayName: 'Vurdering av arbeidsmulighet/Sykmelding ved 17 uker - NAV 08-07.04Q',
        description:
            'Behandlere som ikke bruker elektronisk sykmelding, skal sende sykmeldingens del A til følgende adresse:\n\nNAV Skanning sykmelding del A\n\nPostboks 1411 Sentrum\n0109 Oslo\n\nFlere sykmeldinger kan sendes i samme konvolutt.\n\nSykmeldingens del D skal sendes til NAV Arbeid og ytelser. Det er pasientens bostedsfylke som avgjør hvilken adresse som skal benyttes. Se oversikt over adresser.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykemelding-lege/17-uker#NAV080704Q',
        language: 'nb',
    },
    {
        displayName: 'VURDERING AV ARBEIDSMULIGHET/ SYKMELDING VED 39 UKER - NAV 08-07.04R',
        description:
            'Behandlere som ikke bruker elektronisk sykmelding, skal sende sykmeldingens del A til følgende adresse:\n\nNAV Skanning sykmelding del A\n\nPostboks 1411 Sentrum\n0109 Oslo\n\nFlere sykmeldinger kan sendes i samme konvolutt.\n\nSykmeldingens del D skal sendes til NAV Arbeid og ytelser. Det er pasientens bostedsfylke som avgjør hvilken adresse som skal benyttes. Se oversikt over adresser.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykemelding-lege/39-uker#NAV080704R',
        language: 'nb',
    },
    {
        displayName: 'Agreement regarding child support - NAV 55-00.60',
        description:
            'As custodial parent and non-custodial parent you may use this form to make a private agreement on child support.  If you want NAV to claim the agreed upon child support, you must submit a copy of the agreement to NAV.',
        url: 'https://www.nav.no/soknader/en/person/familie/barnebidrag-og-bidragsforskudd#NAV550060',
        language: 'en',
    },
    {
        displayName: 'Avtale om barnebidrag - NAV 55-00.60',
        description:
            'Dette skjemaet kan dere bruke når dere skal inngå  privat avtale om bidrag. Dersom dere ønsker at NAV skal innkreve det avtalte sender dere en kopi av avtalen til NAV.  \n\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/barnebidrag-og-bidragsforskudd#NAV550060',
        language: 'nb',
    },
    {
        displayName: 'Agreement regarding child support for child over 18 years of age - NAV 55-00.63',
        description:
            'You may use this form to make a private agreement on child support for the child over 18 years of age. Use one form for each of the parents if both of the parentes are going to make a agreement.',
        url: 'https://www.nav.no/soknader/en/person/familie/barnebidrag-og-bidragsforskudd#NAV550063',
        language: 'en',
    },
    {
        displayName: 'Avtale om barnebidrag for barn over 18 år - NAV 55-00.63',
        description:
            'Dette skjemaet kan dere bruke når dere skal inngå  privat avtale om barnebidrag  og barnet er over 18 år. Bruk ett skjema for hver av foreldrene dersom det skal inngås avtale med begge.\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/barnebidrag-og-bidragsforskudd#NAV550063',
        language: 'nb',
    },
    {
        displayName: 'Application form for custodial parent  - NAV 54-00.05',
        description:
            'You can use this form if you want to apply for establishment or alteration of advanced payments of child support.  Children over the age of 18 must apply for themselves. \n\nYou can use the same application form to apply for advanced payments.',
        url: 'https://www.nav.no/soknader/en/person/familie/barnebidrag-og-bidragsforskudd#NAV540005',
        language: 'en',
    },
    {
        displayName: 'Søknadsskjema for bidragsmottaker - NAV 54-00.05',
        description:
            'Søknadsskjemaet skal du bruke dersom du er bidragsmottaker og søker om fastsettelse eller endring av barnebidrag. Barn over 18 år må søke selv\n\nGjelder også for søknad om forskudd.\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/barnebidrag-og-bidragsforskudd#NAV540005',
        language: 'nb',
    },
    {
        displayName: 'Application form for non-custodial parent - NAV 54-00.08',
        description: 'You can use this form if you want to apply for establishment or alteration of advanced payments of child support. ',
        url: 'https://www.nav.no/soknader/en/person/familie/barnebidrag-og-bidragsforskudd#NAV540008',
        language: 'en',
    },
    {
        displayName: 'Søknadsskjema for bidragspliktig - NAV 54-00.08',
        description: 'Søknadsskjemaet skal du bruke dersom du er bidragspliktig og søker om fastsettelse eller endring av barnebidrag. \n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/barnebidrag-og-bidragsforskudd#NAV540008',
        language: 'nb',
    },
    {
        displayName: 'Response to Advance Notice Regarding Child Support Form for Custodial Parent - NAV 54-00.04',
        description: 'You use this form to give information after you receive an advance notice regarding child support.',
        url: 'https://www.nav.no/soknader/en/person/familie/barnebidrag-og-bidragsforskudd#NAV540004',
        language: 'en',
    },
    {
        displayName: 'Svar på forhåndsvarsel i sak om barnebidrag (bidragsmottaker) - NAV 54-00.04',
        description: 'Brukes for å gi opplysninger etter å ha mottatt forhåndsvarsel i sak om barnebidrag.\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/barnebidrag-og-bidragsforskudd#NAV540004',
        language: 'nb',
    },
    {
        displayName: 'Svar på forhåndsvarsel i sak om barnebidrag (bidragspliktig) - NAV 54-00.07',
        description: 'Brukes for å gi opplysninger etter å ha mottatt forhåndsvarsel i sak om barnebidrag.\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/barnebidrag-og-bidragsforskudd#NAV540007',
        language: 'nb',
    },
    {
        displayName: 'Application for Extraordinary Child Support - NAV 54-00.13',
        description:
            'You use this application form if you have had extraordinary expenses for a child and apply for suppport from the other parent. For example expenses for glasses, contact lenses, confirmation, or braces. Remember to attach a copy of receipts or invoices for the expenses you are applying for extraordinary support for.',
        url: 'https://www.nav.no/soknader/en/person/familie/barnebidrag-og-bidragsforskudd#NAV540013',
        language: 'en',
    },
    {
        displayName: 'Søknad om bidrag til særlige utgifter - NAV 54-00.13',
        description:
            'Gjelder dersom du har hatt særlige utgifter til barn og søker om et bidrag fra den andre forelderen. For eksempel utgifter til briller,linser,konfirmasjon eller tannregulering. Husk å sende kopi av kvittering eller faktura på utgiften du søker om særlig bidrag for.',
        url: 'https://www.nav.no/soknader/nb/person/familie/barnebidrag-og-bidragsforskudd#NAV540013',
        language: 'nb',
    },
    {
        displayName: 'Application for Remission of Child Support Debt - NAV 54-00.11',
        description:
            'You use this application form if you are the non-custodial parent and apply for NAV to relieve your child support debt. The form may also be used if you are additionelly applying for alteration of the child support. If you have child support debt for children in different child support cases you must fill out an application for each child support case.',
        url: 'https://www.nav.no/soknader/en/person/familie/barnebidrag-og-bidragsforskudd#NAV540011',
        language: 'en',
    },
    {
        displayName: 'Søknad om sletting av bidragsgjeld - NAV 54-00.11',
        description:
            'Gjelder dersom du er bidragspliktig og skal søke om at NAV skal slette bidragsgjelden din. Skjemaet kan også brukes hvis du i tillegg søker om at barnebidraget skal endres. Dersom du har bidragsgjeld for barn i ulike bidragssaker må du fylle ut en søknad for hver bidragssak.',
        url: 'https://www.nav.no/soknader/nb/person/familie/barnebidrag-og-bidragsforskudd#NAV540011',
        language: 'nb',
    },
    {
        displayName: 'Krav i forbindelse med oppfostringsbidrag etter barnevernloven (For kommunen) - NAV 57-00.05',
        description:
            'Dette skjemaet bruker du:\n\nhvis du skal gi opplysninger fordi du har fått krav om å betale opppfostringsbidrag\n\nhvis du er pålagt å betale oppfostringsbidrag og søker om endringer\n\nhvis du søker om å få ettergitt gjeld i forbindelse med oppfostringsbidrag\n\nLes om hvordan NAV behandler personopplysninger i søknader',
        url: 'https://www.nav.no/soknader/nb/person/familie/barnebidrag-og-bidragsforskudd#NAV570005',
        language: 'nb',
    },
    {
        displayName: 'Application for child benefit - NAV 33-00.07',
        description:
            'Child benefit is as a rule implemented automatically for children born in Norway. If you are not receiving child benefit, you use this form to apply for it.\n\n\n\n',
        url: 'https://www.nav.no/soknader/en/person/familie/barnetrygd#NAV330007',
        language: 'en',
    },
    {
        displayName: 'Søknad om ordinær barnetrygd - NAV 33-00.07',
        description: 'Du får vanligvis barnetrygden automatisk hvis barnet er født i Norge. Får du ikke barnetrygd, må du søke om dette.\n\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/barnetrygd#NAV330007',
        language: 'nb',
    },
    {
        displayName: 'Application for extended child benefit - NAV 33-00.09',
        description:
            'You can only apply for an extended child benefit if you are a single parent.\n\nSingle minor asylum seekers living in their own home may also have the right to extended child benefit.',
        url: 'https://www.nav.no/soknader/en/person/familie/barnetrygd#NAV330009',
        language: 'en',
    },
    {
        displayName: 'Søknad om utvidet barnetrygd - NAV 33-00.09',
        description:
            'Dette gjelder kun dersom du er enslig mor eller far. Enslig mindreårig asylsøkere som bor i egen bolig kan også ha rett til utvidet barnetrygd.',
        url: 'https://www.nav.no/soknader/nb/person/familie/barnetrygd#NAV330009',
        language: 'nb',
    },
    {
        displayName: 'Claim for cash-for-care benefit for parents of young children - NAV 34-00.08',
        description:
            'The child must be between one and two years old. Adopted children can not have started school yet. You can receive cash-for-care benefit from the calendar month after the child have turned one year old and for a maximum of for 11 months. The application must be sent one month prior to the time you are to be granted cash-for-care benefit.',
        url: 'https://www.nav.no/soknader/en/person/familie/kontantstøtte#NAV340008',
        language: 'en',
    },
    {
        displayName: 'Søknad om kontantstøtte til småbarnsforeldre - NAV 34-00.08',
        description:
            'Barnet må være mellom ett og to år. Adoptivbarn kan ikke ha begynt på skolen. Du kan tidligst få kontantstøtte fra måneden etter at barnet fyller ett år og kun i 11 måneder. Søknaden må sendes tidligst en måned før du ønsker å få kontantstøtte.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/kontantstøtte#NAV340008',
        language: 'nb',
    },
    {
        displayName: 'Søknad − underholds­­bidrag til ektefelle - NAV 53-00.05',
        description:
            'Jeg vil søke om bidrag, endring, innkreving eller gi opplysninger i sak om ektefellebidrag\n\nHver av dere kan når som helst be om innkreving av det fastsatte ektefellebidraget.\n\nDersom du har spørsmål om ektefellebidrag, ta kontakt med NAV. \n\nDette skjemaet bruker du når du skal\n\nsøke om å få fastsatt eller endret ektefellebidrag\n\ngi opplysninger til søknaden om ektefellebidrag\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/ektefellebidrag#NAV530005',
        language: 'nb',
    },
    {
        displayName: 'Søknad om overgangsstønad, stønad til barnetilsyn på grunn av arbeid og stønad til skolepenger til enslig mor eller far - NAV 15-00.01',
        description:
            'Dette søknadsskjemaet bruker du hvis du er enslig mor eller far, og søker om\n\n• overgangsstønad.\n• stønad til barnetilsyn på grunn av arbeid\n• stønad til skolepenger (kun semester- og eksamensavgift)\n\nLes mer om overgangsstønad, stønad til barnetilsyn og stønad til skolepenger til enslig mor eller far.\n\nDu skal ikke bruke dette søknadsskjemaet hvis du søker om tilleggsstønader fordi du er i utdanning eller deltar i annen arbeidsrettet aktivitet. Da skal du bruke digital søknad om tilleggsstønader på nav.no.\n\nNedenfor finner du en oversikt over dokumentasjon som du må legge ved søknaden. Det kan være like vedlegg for noen av stønadene nevnt ovenfor. Hvis du søker om flere av disse stønadene samtidig, trenger du ikke legge ved samme dokumentasjon flere ganger.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/enslig-mor-eller-far#NAV150001',
        language: 'nb',
    },
    {
        displayName: 'Kjøreliste for godkjent bruk av egen bil - NAV 00-01.01',
        description:
            'Gjelder kun hvis du har vedtak om rett til å få dekket utgiftene til bruk av egen bil. Du skal oppgi antall dager og dokumenterte parkeringsutgifter.',
        url: 'https://www.nav.no/soknader/nb/person/familie/kjoreliste#NAV000101',
        language: 'nb',
    },
    {
        displayName: 'Opplysnings- og søknadskjema i forbindelse med oppfostringsbdrag etter barnevernloven - NAV 57-00.08',
        description:
            'Dette skjemaet bruker du når barnevernet (kommunen) har satt frem søknad om fastsettelse av oppfostringsbidrag. Dere kan som foreldre begge være bidragspliktige, også når dere bor sammen.\n\nDersom du har spørsmål, ta kontakt med NAV.\n\nDette skjemaet bruker du:\n\nhvis du skal gi opplysninger fordi du har fått krav om å betale opppfostringsbidrag\n\nhvis du er pålagt å betale oppfostringsbidrag og søker om endringer\n\nhvis du søker om å få ettergitt gjeld i forbindelse med oppfostringsbidrag\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/oppfostringsbidrag#NAV570008',
        language: 'nb',
    },
    {
        displayName: 'Søknad om flere omsorgsdager / melding om fordeling og overføring av dagene - NAV 09-06.05',
        description:
            'Dersom du har kronisk syke eller funksjonshemmede barn under 18 år, kan du få øket antall stønadsdager med omsorgspenger. Du bruker dette skjemaet for å søke om forhåndsgodkjenning av øket antall stønadsdager.\n\nHvis du skal søke om flere omsorgsdager fordi du har et kronisk sykt eller funksjonshemmet barn, skal barnets lege fylle ut og signere legeerklæringen i søknadskjemaet NAV 09-06.05. Skjemaet må også fylles ut og signeres av søkeren(e), og sendes til NAV.\n\nDu bruker det samme skjemaet hvis du er alene om omsorgen eller vil fordele/overføre omsorgsdager.\n\nHvis du er arbeidstaker, skal arbeidsgiver sende opplysninger om inntekten din til NAV',
        url: 'https://www.nav.no/soknader/nb/person/familie/omsorgspenger#NAV090605',
        language: 'nb',
    },
    {
        displayName: 'Application for parental benefit in connection with birth - NAV 14-05.09',
        description:
            'You can receive parental benefit\n\nThe parents must each apply separately on separate forms, and they must each print a separate cover page.\n\nIf you are an employee, your employer must send a digital income message 4 weeks before your parental benefit period starts.',
        url: 'https://www.nav.no/soknader/en/person/familie/foreldrepenger-og-engangsstonad#NAV140509',
        language: 'en',
    },
    {
        displayName: 'Søknad om foreldrepenger ved fødsel - NAV 14-05.09',
        description:
            'Gjelder kun dersom du har vært yrkesaktiv og hatt inntekt eller ytelser fra NAV i minst 6 av de 10 siste månedene før foreldrepengeperioden din starter\n\nForeldrene må søke hver for seg på hvert sitt skjema, og de må ta ut hver sin førsteside.\n\nHvis du er arbeidstaker må arbeidsgiveren din sende digital inntektsmelding 4 uker før foreldrepengeperioden din starter.\n\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/foreldrepenger-og-engangsstonad#NAV140509',
        language: 'nb',
    },
    {
        displayName: 'Application for lump-sum grant at birth - NAV 14-05.07',
        description:
            'You can use this form for applying for a lump-sum grant. If you as a mother have not been working and have had income for at least 6 of the last 10 months before the benefit period starts, you can get a lump-sum grant instead of parental benefit at birth. \n\nIt is usually the mother who can receive lump-sum grant, and she must apply herself.\n\n',
        url: 'https://www.nav.no/soknader/en/person/familie/foreldrepenger-og-engangsstonad#NAV140507',
        language: 'en',
    },
    {
        displayName: 'Søknad om engangsstønad ved fødsel - NAV 14-05.07',
        description:
            'Dette skjemaet bruker du når du søker om engangsstønad. Gjelder kun dersom du ikke har vært i arbeid og har hatt pensjonsgivende inntekt i minst 6 av de 10 siste månedene før stønadsperioden starter.\n\nDet er som regel mor som kan få engangsstønad, og hun må søke selv.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/foreldrepenger-og-engangsstonad#NAV140507',
        language: 'nb',
    },
    {
        displayName: 'Application for parental benefit in connection with adoption - NAV 14-05.06',
        description:
            'You can only receive parental benefit if you have been employed and had income or benefits from NAV for at least 6 of the last 10 months before your parental benefit period starts.\n\nThe parents must each apply separately on separate forms, and they must each print a separate cover page.\n\nIf you are an employee, your employer must send a digital income message 4 weeks before your parental benefit period starts.',
        url: 'https://www.nav.no/soknader/en/person/familie/foreldrepenger-og-engangsstonad#NAV140506',
        language: 'en',
    },
    {
        displayName: 'Søknad om foreldrepenger ved adopsjon - NAV 14-05.06',
        description:
            'Gjelder kun dersom du har vært yrkesaktiv og hatt inntekt eller ytelser fra NAV i minst 6 av de 10 siste månedene før foreldrepengeperioden din starter\n\nForeldrene må søke hver for seg på hvert sitt skjema, og de må ta ut hver sin førsteside.\n\nHvis du er arbeidstaker må arbeidsgiveren din sende digital inntektsmelding 4 uker før foreldrepengeperioden din starter.\n\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/foreldrepenger-og-engangsstonad#NAV140506',
        language: 'nb',
    },
    {
        displayName: 'Application for lump-sum grant in connection with adoption - NAV 14-05.08',
        description:
            'You can use this form for applying for a lump-sum grant. If you as a mother have not been working and have had income for at least 6 of the last 10 months before the benefit period starts, you can get a lump-sum grant instead of parental benefit at birth. \n\nIt is usually the mother who can receive lump-sum grant, and she must apply herself.\n\n',
        url: 'https://www.nav.no/soknader/en/person/familie/foreldrepenger-og-engangsstonad#NAV140508',
        language: 'en',
    },
    {
        displayName: 'Søknad om engangsstønad ved adopsjon - NAV 14-05.08',
        description:
            'Dette skjemaet bruker du når du søker om engangsstønad. Gjelder kun dersom du ikke har vært i arbeid og har hatt pensjonsgivende inntekt i minst 6 av de 10 siste månedene før stønadsperioden starter.\n\nDet er som regel mor som kan få engangsstønad, og hun må søke selv.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/foreldrepenger-og-engangsstonad#NAV140508',
        language: 'nb',
    },
    {
        displayName: 'Application for change or new withdrawal of parental benefit - NAV 14-16.05',
        description:
            'You can combine parental benefit with part-time work.\n\nYou can also postpone the parental benefit period if you have arranged annual leave with your employer, are working full time, are sick, or you or your child is admitted to a health institution. \n\nIf this is the first time you apply, you must also attach the form NAV 14-05.09.',
        url: 'https://www.nav.no/soknader/en/person/familie/foreldrepenger-og-engangsstonad#NAV141605',
        language: 'en',
    },
    {
        displayName: 'Søknad om endring eller nytt uttak av foreldrepenger - NAV 14-16.05',
        description:
            'Gjelder søknad om delvis foreldrepenger eller utsettelse.\n\nDu kan jobbe deltid og få delvis foreldrepenger.\n\nDu kan også utsette perioden med foreldrepenger hvis du har lovbestemt ferie, jobber heltid eller hvis du eller barnet er syk.\n\nHvis det er første gang du søker om må du i tillegg fylle ut papirskjema NAV 14-05.09.',
        url: 'https://www.nav.no/soknader/nb/person/familie/foreldrepenger-og-engangsstonad#NAV141605',
        language: 'nb',
    },
    {
        displayName: 'Søknad om svangerskapspenger til selvstendig næringsdrivende og frilanser - NAV 14-04.10',
        description:
            'Svangerskapspenger gis til friske gravide kvinner som ikke kan fortsette i arbeidet under svangerskapet fordi det kan medføre risiko for skade på fosteret. Dersom du er selvstendig næringsdrivende, bruker du dette skjemaet for å søke om svangerskapspenger.\n\nDette skjemaet bruker du hvis du er selvstendig næringsdrivende eller frilanser. Er du arbeidstaker, henter du riktig skjema på siden til Arbeidstilsynet. Også dette skal sendes til NAV. Med søknaden skal det følge en førsteside, som du får laget i skjemaveilederen på nav.no.\n\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/foreldrepenger-og-engangsstonad#NAV140410',
        language: 'nb',
    },
    {
        displayName: 'Inntektsopplysninger for selvstendig næringsdrivende og frilansere som skal ha foreldrepenger eller svangerskapspenger - NAV 14-35.01',
        description:
            'Inntektsopplysninger for selvstendig næringsdrivende og/eller frilansere som skal ha foreldrepenger eller svangerskapspenger\n\nDette skjemaet skal du fylle ut når du skal søke om foreldrepenger eller svangerskapspenger fra NAV og ikke velger elektronisk innsending.Dette skjemaet skal du fylle ut når du skal søke om foreldrepenger eller svangerskapspenger fra NAV og ikke velger elektronisk innsending.\n\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/familie/selvstendig-naringsdrivende-og-frilansere-med-foreldrepenger-eller-svangerskapspenger#NAV143501',
        language: 'nb',
    },
    {
        displayName:
            'Inntektsopplysninger for arbeidstaker som skal ha sykepenger, foreldrepenger, svangerskapspenger, pleie-/opplæringspenger og omsorgspenger - NAV 08-30.01',
        description:
            'Dette skjemaet bruker du til å opplyse NAV om arbeidstakers inntekter på sykepenger. Skjemaet bruker du når NAV skal utbetale ordinære sykepenger etter utløpet av arbeidsgiverperioden, som er fra 17. fraværsdag.\n\nFra 1. januar 2019 må arbeidsgiver sende digital inntektsmelding. Det er ikke lenger mulig å bruke papirskjemaet når arbeidstakers første fraværsdag er 1. januar 2019 eller senere. Denne kan tidligst sendes inn fire uker før fraværet starter.\n\nDersom første fraværsdag var i 2018 kan du sende inntektsmelding på papir om første fraværsdag var i 2018. Merk at skjemaet vil sendes i retur om det gjelder fravær som starter i 2019.\n\nHvor skal du sende inntektsskjemaet for sykepenger?\n\nFor at skjemaet skal komme raskt frem til de som skal behandle saken finner du frem til riktig adresse her.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykepenger/inntektsopplysninger-arbeidstaker-sykepenger#NAV083001',
        language: 'nb',
    },
    {
        displayName: 'Søknad om refusjon av reisetilskudd til arbeidsreiser - NAV 08-14.01',
        description:
            'For at arbeidsgiver skal kunne fremsette krav om refusjon, må arbeidstaker ha søkt og fått innvilget reisetilskudd fra NAV. Hvis du som arbeidsgiver dekker transportutgiftene til arbeidstaker, kan du søke om refusjon av dine utlegg.\n\nArbeidsgiver skal bruke dette skjemaet hver gang du sender inn dokumentasjon på dine utlegg.\n\nReisetilskuddet skal dekke nødvendige ekstra transportutgifter. Arbeidstakeren kan få reisetilskudd i stedet for sykepenger eller i kombinasjon med graderte sykepenger, jf folketrygdlovens § 8-14.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykepenger/reiseutgifter#NAV081401',
        language: 'nb',
    },
    {
        displayName: 'Inntektsopplysninger for selvstendig næringsdrivende og/eller frilansere som skal ha sykepenger - NAV 08-35.01',
        description:
            'Dette skjemaet skal du fylle ut når du skal søke om sykepenger fra NAV. Du skal kun fylle ut og sende inn dette skjemaet én gang. Hvis du sender inn nye sykepengekrav (forlengelser) skal du ikke fylle ut skjemaet.\n\nHvis du i løpet av de siste fire årene har startet næringsvirksomhet eller fått en varig endring av arbeidssituasjonen/virksomheten, må du dokumentere dette. Du krysser av for det av de fire alternativene nedenfor du bruker som dokumentasjon.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykepenger/inntektsopplysninger-selvstendig-sykepenger#NAV083501',
        language: 'nb',
    },
    {
        displayName: 'Søknad om unntak fra arbeidsgiveransvar for sykepenger til en arbeidstaker som lider av en langvarig eller kronisk sykdom - NAV 08-20.05',
        description:
            'Dette skjemaet brukes når du skal sende inn søknad om unntak fra arbeidsgiveransvar for sykepenger til arbeidstaker som lider av en langvarig eller kronisk sykdom.\n\nDette skjemaet bruker du hvis du vil søke om at arbeidsgiver fritas for plikten til å utbetale sykepenger i arbeidsgiverperioden',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykepenger/unntak-arbeidsgiveransvar-sykdom#NAV082005',
        language: 'nb',
    },
    {
        displayName: 'Søknad om unntak fra arbeidsgiveransvar for sykepenger til en arbeidstaker som har sykefravær på grunn av svangerskap - NAV 08-20.20',
        description:
            'Dette skjemaet brukes til å søke om unntak fra arbeidsgiveransvar for sykepenger til en arbeidstaker som har sykefravær på grunn av svangerskap, og som ikke kan omplasseres til annet arbeid i virksomheten.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykepenger/unntak-arbeidsgiveransvar-svangerskapsrelatert#NAV082020',
        language: 'nb',
    },
    {
        displayName: 'Forsikring mot ansvar for sykepenger i arbeidsgiverperioden for små bedrifter - krav om refusjon - NAV 08-21.15',
        description:
            'Dette skjemaet bruker du som arbeidsgiver for å be om refusjon av sykepenger som du har utbetalt til arbeidstaker i arbeidsgiverperioden. Du må ha gyldig forsikring for små bedrifter for å få refundert sykepenger i arbeidsgiverperioden. Skjemaet bruker du kun for fravær i arbeidsgiverperioden, det vil si fra 4. til 16. fraværsdag.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykepenger/forsikring-arbeidsgiveransvar#NAV082115',
        language: 'nb',
    },
    {
        displayName: 'Forsikring mot ansvar for sykepenger i arbeidsgiverperioden for små bedrifter - krav om refusjon - NAV 08-21.15',
        description:
            'Dette skjemaet bruker du som arbeidsgiver for å be om refusjon av sykepenger som du har utbetalt til arbeidstaker i arbeidsgiverperioden. Du må ha gyldig forsikring for små bedrifter for å få refundert sykepenger i arbeidsgiverperioden. Skjemaet bruker du kun for fravær i arbeidsgiverperioden, det vil si fra 4. til 16. fraværsdag.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykepenger/refusjonskrav-sykepenger#NAV082115',
        language: 'nb',
    },
    {
        displayName: 'Oppfølgingsplan ved sykmelding - NAV 25-02.01',
        description:
            'Oppfølgingsplanen er tilgjengelig for de som har tatt i bruk den digitale sykmeldingen. Planen utarbeides av arbeidstakeren og lederen på nav.no. Den kan deles med både legen og NAV fra løsningen.\n\nOppfølgingsplanen skal sendes uoppfordret til sykmelder når den er utarbeidet første gang, dvs ved 4 uker. NAV skal ha oppfølgingsplanen tilsendt når de ber om det.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykepenger/oppfølgingsplan#NAV250201',
        language: 'nb',
    },
    {
        displayName: 'Arbeidsplassvurdering - Rekvisisjon og rapportskjema - NAV 08-07.19',
        description:
            'NAV kan dekke utgiftene når en fysioterapeut eller ergoterapeut vurderer tilretteleggingsbehov på arbeidsplassen. Du kan få en arbeidsplassvurdering hvis du er ansatt i en bedrift uten bedriftshelsetjeneste og er sykmeldt eller står i fare for å bli sykmeldt.',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykepenger/arbeidsplassvurdering#NAV080719',
        language: 'nb',
    },
    {
        displayName:
            'Krav fra arbeidsgiveren om refusjon av sykepenger utbetalt i arbeidsgiverperioden til en arbeidstaker som er unntatt fra arbeidsgiveransvar - NAV 08-20.12',
        description:
            'Dette skjemaet bruker du hvis du skal kreve refusjon for sykepenger utbetalt i arbeidsgiverperioden.\n\nViktig informasjon om kronisk syk eller gravid arbeidstaker. ',
        url: 'https://www.nav.no/soknader/nb/bedrift/sykepenger/refusjon-kronisk-sykdom-svangerskap#NAV082012',
        language: 'nb',
    },
    {
        displayName: 'Application for children’s pension when one parent has died - NAV 18-04.01',
        description:
            "You use this form if you apply for children’s pension for children who have lost one of their parents. The pension shall ensure that the child has an income on which to live. Read more about children's pension",
        url: 'https://www.nav.no/soknader/en/person/stonader-ved-dodsfall/ barn-som-har-mistet-en-eller-begge-foreldrene#NAV180401',
        language: 'en',
    },
    {
        displayName: 'Søknad om barnepensjon når en forelder er død - NAV 18-04.01',
        description: 'Gjelder kun når en av foreldrene er død.\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/stonader-ved-dodsfall/ barn-som-har-mistet-en-eller-begge-foreldrene#NAV180401',
        language: 'nb',
    },
    {
        displayName: 'Claim for children’s pension for orphaned children - NAV 18-01.05',
        description:
            'You use this form if you apply for children’s pension when both parents have died, or have lost their mother and no paternity has been established. Read more about children’s pension',
        url: 'https://www.nav.no/soknader/en/person/stonader-ved-dodsfall/ barn-som-har-mistet-en-eller-begge-foreldrene#NAV180105',
        language: 'en',
    },
    {
        displayName: 'Søknad om barnepensjon for foreldreløse barn - NAV 18-01.05',
        description: 'Gjelder kun for barn som er foreldreløse eller har mistet mor og farskapet ikke er formelt bestemt.',
        url: 'https://www.nav.no/soknader/nb/person/stonader-ved-dodsfall/ barn-som-har-mistet-en-eller-begge-foreldrene#NAV180105',
        language: 'nb',
    },
    {
        displayName: 'Søknad om forlenget barnepensjon etter fylte 18 år - NAV 18-04.05',
        description:
            'Foreldreløse som er under utdanning kan ha rett til stønad inntil 20 år. Når dødsfallet skyldes en yrkesskade kan barnet har rett til barnepensjon under utdanning inntil 21 år.',
        url: 'https://www.nav.no/soknader/nb/person/stonader-ved-dodsfall/ barn-som-har-mistet-en-eller-begge-foreldrene#NAV180405',
        language: 'nb',
    },
    {
        displayName: 'Application for benefits for persons providing family care previously - NAV 16-01.05',
        description:
            'As a previous family carer you may be entitled to pension or transitional benefit if you are single, younger than 67 years of age and have cared for and nursed other people close to you for at least 5 years, and the care and nursing made it impossible for you to work and sustain yourself during the period of care and after the period was over. Read more about benefit for former family carers',
        url: 'https://www.nav.no/soknader/en/person/stonader-ved-dodsfall/familiepleier#NAV160105',
        language: 'en',
    },
    {
        displayName: 'Søknad om ytelser til tidligere familiepleier - NAV 16-01.05',
        description:
            'Gjelder kun dersom du er ugift, under 67 år og i minst fem år har pleiet en du har hatt en nær relasjon til. Du har ikke kunnet arbeide på grunn av pleieoppgavene, og heller ikke etterpå.',
        url: 'https://www.nav.no/soknader/nb/person/stonader-ved-dodsfall/familiepleier#NAV160105',
        language: 'nb',
    },
    {
        displayName:
            'Søknad om stønad til barnetilsyn på grunn av arbeid og stønad til skolepenger til gjenlevende ektefelle/partner/ samboer og til ugift familiepleier - NAV 15-12.01',
        description:
            'Gjelder kun utgifter du har til barnepass mens du studerer eller jobber. Studiene dine må være offentlig godkjent for at du skal få skolepenger',
        url: 'https://www.nav.no/soknader/nb/person/stonader-ved-dodsfall/familiepleier#NAV151201',
        language: 'nb',
    },
    {
        displayName: 'Søknad om ytelser til gjenlevende ektefelle/partner/samboer og gjenlevende barn - NAV 17-01.05',
        description: 'Gjelder kun stønad til livsopphold. Du har kun rett til stønaden dersom du ikke har egen inntekt.',
        url: 'https://www.nav.no/soknader/nb/person/stonader-ved-dodsfall/gjenlevende-ektefelle-partner-eller-samboer#NAV170105',
        language: 'nb',
    },
    {
        displayName:
            'Søknad om stønad til barnetilsyn på grunn av arbeid og stønad til skolepenger til gjenlevende ektefelle/partner/ samboer og til ugift familiepleier - NAV 15-12.01',
        description:
            'Gjelder kun utgifter du har til barnepass mens du studerer eller jobber. Studiene dine må være offentlig godkjent for at du skal få skolepenger',
        url: 'https://www.nav.no/soknader/nb/person/stonader-ved-dodsfall/gjenlevende-ektefelle-partner-eller-samboer#NAV151201',
        language: 'nb',
    },
    {
        displayName: 'Søknad om gravferdsstønad - NAV 07-02.08',
        description:
            'Barn under 18 år vil alltid ha rett til gravferdsstønad. Dersom et barn er dødfødt stilles det heller ikke krav til formue. I alle andre tilfeller er det formuen til avdøde eller formuen til avdøde og gjenlevende som avgjør om du har rett til gravferdsstønaden. ',
        url: 'https://www.nav.no/soknader/nb/person/stonader-ved-dodsfall/gravferdsstonad-og-baretransport#NAV070208',
        language: 'nb',
    },
    {
        displayName: 'General authorisation - NAV 95-15.36',
        description:
            'To be certain that your personal information is not given to unauthorized personnel, we kindly ask you to fill in this form and return it to NAV as soon as possible.',
        url: 'https://www.nav.no/soknader/en/bedrift/diverse-bedrift/utsendt-arbeidstaker#NAV951536',
        language: 'en',
    },
    {
        displayName: 'Generell fullmakt - NAV 95-15.36',
        description:
            'For å sikre at ingen uvedkommende får opplysninger i saken din hos NAV, må du gi fullmakt til den eller de personene som du vil at skal ha innsyn i saken din. Du kan gi fullmakt ved å bruke dette skjemaet. Du bestemmer selv hva fullmakten skal omfatte, og hvor lenge den skal gjelde.\n\n',
        url: 'https://www.nav.no/soknader/nb/bedrift/diverse-bedrift/utsendt-arbeidstaker#NAV951536',
        language: 'nb',
    },
    {
        displayName: 'Skjema for arbeidsgiver som sender arbeidstaker eller frilanser på midlertidig oppdrag i EØS/Sveits - NAV 02-08.08',
        description:
            'Dette skjemaet er et vedlegg til skjema NAV 02-08.07 «Søknad om A1 - Avklaring av trygdetilhørighet ved arbeid innen EØS/Sveits». Det skal fylles ut når dere sender en arbeidstaker eller frilanser på midlertidig oppdrag til et annet land innenfor EØS/Sveits, og sendes til NAV sammen med selve søknaden. Hvis NAV ikke mottar skjemaet samtidig med søknaden, vil det ta lengre tid å behandle søknaden.\n\nNår du kommer til punktet «Oppgi hvem innsendelsen gjelder», må du\n\nkrysse av for «En privatperson» og oppgi fødselsnummeret til den utsendte arbeidstakeren eller\n\nkrysse av for «Flere personer samtidig» og oppgi «4530» som NAV-enhet\n\nLes mer om midlertidige arbeidsoppdrag i EØS-land eller Sveits',
        url: 'https://www.nav.no/soknader/nb/bedrift/diverse-bedrift/utsendt-arbeidstaker#NAV020808',
        language: 'nb',
    },
    {
        displayName: 'Søknad om gravferdsstønad - NAV 07-02.08',
        description:
            'Barn under 18 år vil alltid ha rett til gravferdsstønad. Dersom et barn er dødfødt stilles det heller ikke krav til formue. I alle andre tilfeller er det formuen til avdøde eller formuen til avdøde og gjenlevende som avgjør om du har rett til gravferdsstønaden. ',
        url: 'https://www.nav.no/soknader/nb/bedrift/diverse-bedrift/gravferd-og-baretransport#NAV070208',
        language: 'nb',
    },
    {
        displayName: 'Melding til NAV om elevs fravær fra skolen som kan skyldes utenlandsopphold  - NAV 21-04.05',
        description: 'Melding til NAV om elevs fravær fra skolen som kan skyldes utenlandsopphold.\n\nVelg skjema for melding om fravær NAV 21-04.05',
        url: 'https://www.nav.no/soknader/nb/bedrift/diverse-bedrift/melding-om-elevs-fravar#NAV210405',
        language: 'nb',
    },
    {
        displayName: 'Melding om person som er i varetekt, gjennomfører straff i fengsel eller annen institusjon, eller er i forvaring - NAV 08-54.05',
        description:
            'Dette skjemaet skal benyttes til meldinger mellom Kriminalomsorgen og NAV. Det finnes egne regler for å beregne økonomiske ytelser under institusjonsopphold og i fengsel. NAV har derfor behov for rask informasjon fra Kriminalomsorgen når en person kommer i varetekt eller soner en fengselsdom. NAV kan pålegge helseinstitusjoner, fengsler og boformer for heldøgns omsorg og pleie å gi rutinemessige meldinger om innskriving og utskriving av klienter. De som blir pålagt å gi opplysninger, erklæringer og uttalelser, plikter å gjøre dette uten hinder av taushetsplikt. Hjemmelen for dette er folketrygdloven § 21-4.',
        url: 'https://www.nav.no/soknader/nb/bedrift/diverse-bedrift/melding-om-institusjonsopphold#NAV085405',
        language: 'nb',
    },
    {
        displayName: 'Krav i forbindelse med oppfostringsbidrag etter barnevernloven (For kommunen) - NAV 57-00.05',
        description:
            'Dette skjemaet bruker du:\n\nhvis du skal gi opplysninger fordi du har fått krav om å betale opppfostringsbidrag\n\nhvis du er pålagt å betale oppfostringsbidrag og søker om endringer\n\nhvis du søker om å få ettergitt gjeld i forbindelse med oppfostringsbidrag\n\nLes om hvordan NAV behandler personopplysninger i søknader',
        url: 'https://www.nav.no/soknader/nb/bedrift/diverse-bedrift/oppfostringsbidrag#NAV570005',
        language: 'nb',
    },
    {
        displayName: 'Alderspensjon og avtalefestet pensjon',
        description: '.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/alderspensjon-og-avtalefestet-pensjon',
        language: 'nb',
        keywords: ['NAV 19-01.05', 'NAV 19-01.10'],
    },
    {
        displayName: 'Application for retirement pension - NAV 19-01.05',
        description:
            'You use this form if you want to begin drawing retirement pension from January 2011 or later. The application will reach the case handler faster if you log in to “Din pensjon” and choose electronic application. Read more about retirement pension\n\n',
        url: 'https://www.nav.no/soknader/en/person/pensjon/alderspensjon-og-avtalefestet-pensjon#NAV190105',
        language: 'en',
    },
    {
        displayName: 'Søknad om alderspensjon - NAV 19-01.05',
        description: 'Søknaden din kommer raskere frem om du logger deg inn på "Din pensjon" og velger elektronisk sønad.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/alderspensjon-og-avtalefestet-pensjon#NAV190105',
        language: 'nb',
    },
    {
        displayName: 'Changing your retirement pension - NAV 19-01.10',
        description:
            'If you are born in 1943 or later, and started drawing the pension at the earliest in January 2011, you may change the level of retirement pension you receive. It is easier to apply for flexible retirement pension electronically at “Din pensjon”, but you can also use the form below. Read more about flexible retirement pension',
        url: 'https://www.nav.no/soknader/en/person/pensjon/alderspensjon-og-avtalefestet-pensjon#NAV190110',
        language: 'en',
    },
    {
        displayName: 'Endring av alderspensjon - NAV 19-01.10',
        description:
            'Gjelder kun dersom du er født i 1943 eller senere. Du får raskere saksbehandling dersom du logger deg inn på "Din pensjon" og velger elektronisk søknad.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/alderspensjon-og-avtalefestet-pensjon#NAV190110',
        language: 'nb',
    },
    {
        displayName: 'Skjema for tilbakemelding til NAV om inntekt som skal holdes utenfor etteroppgjøret for avtalefestet pensjon (AFP) - NAV 62-03.01',
        description:
            'Jeg vil gi beskjed om inntekter som ikke skal regnes med i etteroppgjøret og legger ved dokumentasjon som viser at inntekten er opptjent før uttak av AFP / etter opphør av AFP.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/avtalefestet-pensjon-etteroppgjor#NAV620301',
        language: 'nb',
    },
    {
        displayName: 'Overføring av omsorgsopptjening for barn',
        description: 'Test',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/overforing-av-omsorgsopptjening-for-barn',
        language: 'nb',
        keywords: ['NAV 03-16.10'],
    },
    {
        displayName: 'Transferring acquired rights for care work - NAV 03-16.10',
        description:
            'If you have acquired rights for work caring for small children and wish to transfer these to the other parent, you use this form or go to “Din pensjon” and do it electronically.',
        url: 'https://www.nav.no/soknader/en/person/pensjon/overforing-av-omsorgsopptjening-for-barn#NAV031610',
        language: 'en',
    },
    {
        displayName: 'Overføring av omsorgsopptjening - NAV 03-16.10',
        description:
            'Dersom du har fått omsorgspoeng for et barn under 7 år og ønsker å overføre dette til den andre forelderen, kan du bruke skjemaet under, eller gå til «Din pensjon» og gjøre det elektronisk der. Les mer om omsorgsopptjening',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/overforing-av-omsorgsopptjening-for-barn#NAV031610',
        language: 'nb',
    },
    {
        displayName: 'Godskriving av omsorgsopptjening',
        description: 'Test',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/godskriving-av-omsorgsopptjening',
        language: 'nb',
        keywords: ['NAV 03-16.10', 'NAV 03-16.01'],
    },
    {
        displayName: 'Transferring acquired rights for care work - NAV 03-16.10',
        description:
            'If you have acquired rights for work caring for small children and wish to transfer these to the other parent, you use this form or go to “Din pensjon” and do it electronically.',
        url: 'https://www.nav.no/soknader/en/person/pensjon/godskriving-av-omsorgsopptjening#NAV031610',
        language: 'en',
    },
    {
        displayName: 'Overføring av omsorgsopptjening - NAV 03-16.10',
        description:
            'Dersom du har fått omsorgspoeng for et barn under 7 år og ønsker å overføre dette til den andre forelderen, kan du bruke skjemaet under, eller gå til «Din pensjon» og gjøre det elektronisk der. Les mer om omsorgsopptjening',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/godskriving-av-omsorgsopptjening#NAV031610',
        language: 'nb',
    },
    {
        displayName: 'Søknad om godskriving av pensjonsopptjening - NAV 03-16.01',
        description:
            'Gjelder kun dersom du ikke har fått godkjent poeng tidligere for dette barnet denne perioden.\n\nDu må være født i 1954 eller senere, og hatt omsorg for barn til de var seks år i perioden før 1992.\n\nDu kan også ha rett til pensjonsopptjening hvis du har vært medlem av folketrygden under opphold i utlandet, med omsorg for barn til de var seks år etter 1992.\n\nFra 2010 er aldersgrensen fem år.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/godskriving-av-omsorgsopptjening#NAV031601',
        language: 'nb',
    },
    {
        displayName: 'Application for children’s pension when one parent has died - NAV 18-04.01',
        description:
            "You use this form if you apply for children’s pension for children who have lost one of their parents. The pension shall ensure that the child has an income on which to live. Read more about children's pension",
        url: 'https://www.nav.no/soknader/en/person/pensjon/barn-som-har-mistet-en-eller-flere-av-foreldrene#NAV180401',
        language: 'en',
    },
    {
        displayName: 'Søknad om barnepensjon når en forelder er død - NAV 18-04.01',
        description: 'Gjelder kun når en av foreldrene er død.\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/barn-som-har-mistet-en-eller-flere-av-foreldrene#NAV180401',
        language: 'nb',
    },
    {
        displayName: 'Claim for children’s pension for orphaned children - NAV 18-01.05',
        description:
            'You use this form if you apply for children’s pension when both parents have died, or have lost their mother and no paternity has been established. Read more about children’s pension',
        url: 'https://www.nav.no/soknader/en/person/pensjon/barn-som-har-mistet-en-eller-flere-av-foreldrene#NAV180105',
        language: 'en',
    },
    {
        displayName: 'Søknad om barnepensjon for foreldreløse barn - NAV 18-01.05',
        description: 'Gjelder kun for barn som er foreldreløse eller har mistet mor og farskapet ikke er formelt bestemt.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/barn-som-har-mistet-en-eller-flere-av-foreldrene#NAV180105',
        language: 'nb',
    },
    {
        displayName: 'Søknad om forlenget barnepensjon etter fylte 18 år - NAV 18-04.05',
        description:
            'Foreldreløse som er under utdanning kan ha rett til stønad inntil 20 år. Når dødsfallet skyldes en yrkesskade kan barnet har rett til barnepensjon under utdanning inntil 21 år.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/barn-som-har-mistet-en-eller-flere-av-foreldrene#NAV180405',
        language: 'nb',
    },
    {
        displayName: 'Application for benefits for persons providing family care previously - NAV 16-01.05',
        description:
            'As a previous family carer you may be entitled to pension or transitional benefit if you are single, younger than 67 years of age and have cared for and nursed other people close to you for at least 5 years, and the care and nursing made it impossible for you to work and sustain yourself during the period of care and after the period was over. Read more about benefit for former family carers',
        url: 'https://www.nav.no/soknader/en/person/pensjon/familiepleier#NAV160105',
        language: 'en',
    },
    {
        displayName: 'Søknad om ytelser til tidligere familiepleier - NAV 16-01.05',
        description:
            'Gjelder kun dersom du er ugift, under 67 år og i minst fem år har pleiet en du har hatt en nær relasjon til. Du har ikke kunnet arbeide på grunn av pleieoppgavene, og heller ikke etterpå.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/familiepleier#NAV160105',
        language: 'nb',
    },
    {
        displayName:
            'Søknad om stønad til barnetilsyn på grunn av arbeid og stønad til skolepenger til gjenlevende ektefelle/partner/ samboer og til ugift familiepleier - NAV 15-12.01',
        description:
            'Gjelder kun utgifter du har til barnepass mens du studerer eller jobber. Studiene dine må være offentlig godkjent for at du skal få skolepenger',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/familiepleier#NAV151201',
        language: 'nb',
    },
    {
        displayName: 'Søknad om forsørgingstillegg - NAV 03-24.05',
        description: 'Forsørgingstillegget inntektsprøves med utgangspunkt i familiens samlede inntekt.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/forsorgingstillegg#NAV032405',
        language: 'nb',
    },
    {
        displayName: 'Søknad om ytelser til gjenlevende ektefelle/partner/samboer og gjenlevende barn - NAV 17-01.05',
        description: 'Gjelder kun stønad til livsopphold. Du har kun rett til stønaden dersom du ikke har egen inntekt.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/gjenlevende-ektefelle-partner-eller-samboer#NAV170105',
        language: 'nb',
    },
    {
        displayName:
            'Søknad om stønad til barnetilsyn på grunn av arbeid og stønad til skolepenger til gjenlevende ektefelle/partner/ samboer og til ugift familiepleier - NAV 15-12.01',
        description:
            'Gjelder kun utgifter du har til barnepass mens du studerer eller jobber. Studiene dine må være offentlig godkjent for at du skal få skolepenger',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/gjenlevende-ektefelle-partner-eller-samboer#NAV151201',
        language: 'nb',
    },
    {
        displayName: 'Kjøreliste for godkjent bruk av egen bil - NAV 00-01.01',
        description:
            'Gjelder kun hvis du har vedtak om rett til å få dekket utgiftene til bruk av egen bil. Du skal oppgi antall dager og dokumenterte parkeringsutgifter.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/kjoreliste#NAV000101',
        language: 'nb',
    },
    {
        displayName: 'Endringsblankett for inntekt - NAV 21-03.15',
        description: 'Gjelder arbeidsinntekten din eller inntekten til ektefeller, samboeren eller partneren din.\n\n',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/melde-fra-om-inntektsendringer#NAV210315',
        language: 'nb',
    },
    {
        displayName: 'Krav om invalidepensjon - NAV 31-00.02',
        description:
            'Gjelder personer som har fått mén eller nedsatt arbeidsevne på grunn av skade eller påkjenninger etter sjøtjeneste, militær tjeneste, motstandsarbeid eller politisk fangenskap under krigen 1939-45. Andre som er blitt skadet på grunn av krigsulykke eller hendinger som skyldes krigen, kan ha rett til krigspensjon.',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/krigspensjon#NAV310002',
        language: 'nb',
    },
    {
        displayName: 'Krav om etterlattepensjon - NAV 31-00.03',
        description: 'Gjelder kun etterlatte etter krigspensjonister',
        url: 'https://www.nav.no/soknader/nb/person/pensjon/krigspensjon#NAV310003',
        language: 'nb',
    },
    {
        displayName: 'Søknad om gravferdsstønad - NAV 07-02.08',
        description:
            'Barn under 18 år vil alltid ha rett til gravferdsstønad. Dersom et barn er dødfødt stilles det heller ikke krav til formue. I alle andre tilfeller er det formuen til avdøde eller formuen til avdøde og gjenlevende som avgjør om du har rett til gravferdsstønaden. ',
        url:
            'https://www.nav.no/soknader/nb/person/pensjon/https://www.nav.no/no/Bedrift/Skjemaer-for-arbeidsgivere/Skjemaer/Diverse/Gravferd+og+baretransport#NAV070208',
        language: 'nb',
    },
    {
        displayName: 'Søknad om arbeidsavklaringspenger - NAV 11-13.05',
        description:
            'Du kan søke om AAP dersom du har behov for medisinsk behandling eller tiltak som skal hjelpe deg tilbake i arbeid. AAP skal sikre deg inntekt i perioder hvor du, på grunn av sykdom eller skade, har behov for hjelp fra NAV for å komme i arbeid.\n\nOBS! Du må først registrere deg som arbeidssøker før du kan søke om arbeidsavklaringspenger. ',
        url: 'https://www.nav.no/soknader/nb/person/helse/arbeidsavklaringspenger#NAV111305',
        language: 'nb',
    },
    {
        displayName: 'Oppfølging arbeidsavklaring - NAV 00-02.00',
        description:
            'Bruk lenken nedenfor hvis du enten mottar tilleggsstønader og skal sende inn kjøreliste, eller hvis du mottar arbeidsavklaringspenger og skal sende inn annen dokumentasjon for å følge opp saken din.\n\nDisse vedleggene bruker du i forbindelse med arbeidsavklaringspenger.',
        url: 'https://www.nav.no/soknader/nb/person/helse/arbeidsavklaringspenger#NAV000200',
        language: 'nb',
    },
    {
        displayName: 'Søknad om gjenopptak av arbeidsavklaringspenger - NAV 11-13.06',
        description: 'Dette gjelder kun hvis du har fått arbeidsavklaringspenger før og det er mindre enn 52 uker siden du sist fikk arbeidsavklaringspenger.',
        url: 'https://www.nav.no/soknader/nb/person/helse/arbeidsavklaringspenger#NAV111306',
        language: 'nb',
    },
    {
        displayName: 'Søknad om å beholde arbeidsavklaringspenger under opphold i utlandet - NAV 11-03.07',
        description: 'Jeg vil søke om å få beholde arbeidsavklaringspengene mens jeg oppholder med i utlandet.',
        url: 'https://www.nav.no/soknader/nb/person/helse/arbeidsavklaringspenger#NAV110307',
        language: 'nb',
    },
    {
        displayName: 'Kjøreliste for godkjent bruk av egen bil - NAV 00-01.01',
        description:
            'Gjelder kun hvis du har vedtak om rett til å få dekket utgiftene til bruk av egen bil. Du skal oppgi antall dager og dokumenterte parkeringsutgifter.',
        url: 'https://www.nav.no/soknader/nb/person/helse/kjoreliste#NAV000101',
        language: 'nb',
    },
    {
        displayName: 'Søknad fra selvstendig næringsdrivende/frilansere om opptak/endring i forsikring for tillegg til sykepenger - NAV 08-36.05',
        description: 'Dette skjemaet bruker du dersom du er selvstendig næringsdrivende eller frilanser, og vil søke om forsikring for tillegg til sykepenger.',
        url: 'https://www.nav.no/soknader/nb/person/helse/forsikring#NAV083605',
        language: 'nb',
    },
    {
        displayName: 'Søknad fra selvstendig næringsdrivende og frilansere om opptak i frivillig trygd med rett til særytelser ved yrkesskade - NAV 13-13.05',
        description:
            'Jeg vil søke om frivillig trygdeordning for å få rett til særytelser på grunn av yrkesskade.\n\nDette gjelder kun for selvstendig næringsdrivende.',
        url: 'https://www.nav.no/soknader/nb/person/helse/forsikring#NAV131305',
        language: 'nb',
    },
    {
        displayName: 'Søknad om grunnstønad - NAV 06-03.04',
        description:
            'Dette skjemaet bruker du hvis du har ekstrautgifter på grunn av en sykdom, skade eller medfødte feil og misdannelser (lyte). Hvis du søker på vegne av en annen person, må du fylle inn fødselsnummeret på personen søknaden gjelder. Gjelder den for eksempel et barn, er det barnets fødselsnummer du fyller inn. ',
        url: 'https://www.nav.no/soknader/nb/person/helse/grunn-og-hjelpestonad#NAV060304',
        language: 'nb',
    },
    {
        displayName: 'Krav om hjelpestønad - NAV 06-04.04',
        description:
            'Dette skjemaet bruker du hvis du har et spesielt behov for pleie og tilsyn.\n\nHvis du søker på vegne av en annen person, må du fylle inn fødselsnummeret på personen søknaden gjelder. Gjelder den for eksempel et barn, er det barnets fødselsnummer du fyller inn.',
        url: 'https://www.nav.no/soknader/nb/person/helse/grunn-og-hjelpestonad#NAV060404',
        language: 'nb',
    },
    {
        displayName: 'Inntektsopplysninger for selvstendig næringsdrivende og/eller frilansere som skal ha sykepenger - NAV 08-35.01',
        description:
            'Dette skjemaet skal du fylle ut når du skal søke om sykepenger fra NAV. Du skal kun fylle ut og sende inn dette skjemaet én gang. Hvis du sender inn nye sykepengekrav (forlengelser) skal du ikke fylle ut skjemaet.\n\nHvis du i løpet av de siste fire årene har startet næringsvirksomhet eller fått en varig endring av arbeidssituasjonen/virksomheten, må du dokumentere dette. ',
        url: 'https://www.nav.no/soknader/nb/person/helse/sykepenger#NAV083501',
        language: 'nb',
    },
    {
        displayName: 'Søknad om refusjon av reisetilskudd til arbeidsreiser - NAV 08-14.01',
        description:
            'For at du skal kunne fremsette krav om refusjon, må du ha søkt og fått innvilget reisetilskudd fra NAV.\n\nDu skal bruke dette skjemaet hver gang du sender inn dokumentasjon på reiseutgifter som du søker om refusjon for.\n\nReisetilskuddet skal dekke nødvendige ekstra transportutgifter. Du kan få reisetilskudd i stedet for sykepenger eller i kombinasjon med graderte sykepenger, jf folketrygdlovens § 8-14.',
        url: 'https://www.nav.no/soknader/nb/person/helse/sykepenger#NAV081401',
        language: 'nb',
    },
    {
        displayName: 'Declaration form for Non-Norwegian Medical Certificates - NAV 08-09.06',
        description:
            'If you have a medical certificate from a doctor outsideNorway, you must complete this form, attach the medical certificate and send the documents to NAV.',
        url: 'https://www.nav.no/soknader/en/person/helse/sykepenger#NAV080906',
        language: 'en',
    },
    {
        displayName: 'Egenerklæring for utenlandske sykmeldinger - NAV 08-09.06',
        description: 'Dersom du har sykmelding fra lege utenfor Norge, må du fylle ut dette skjemaet, vedlegge sykmeldingen og sende til NAV.',
        url: 'https://www.nav.no/soknader/nb/person/helse/sykepenger#NAV080906',
        language: 'nb',
    },
    {
        displayName: 'Krav om sykepenger – midlertidig ute av inntektsgivende arbeid - NAV 08-47.05',
        description:
            'Yrkesaktive medlemmer som på sykmeldingstidspunktet midlertidig har vært ute av inntektsgivende arbeid i mindre enn en måned, og som fremdeles er ute av inntektsgivende arbeid, eller har vært i arbeid uten å fylle vilkåret om fire ukers opptjeningstid, kan ha krav på sykepenger fra NAV.\n\nDette skjemaet bruker du hvis det er under en måned siden forrige arbeidsforhold opphørte, du mottar etterlønn/sluttvederlag, er i utdanningspermisjon, eller du har startet i nytt arbeidsforhold uten å ha ny opptjening til sykepenger.',
        url: 'https://www.nav.no/soknader/nb/person/helse/sykepenger#NAV084705',
        language: 'nb',
    },
    {
        displayName: 'Søknad om unntak fra arbeidsgiveransvar for sykepenger til en arbeidstaker som lider av en langvarig eller kronisk sykdom - NAV 08-20.05',
        description:
            'Dette skjemaet brukes når du skal sende inn søknad om unntak fra arbeidsgiveransvar for sykepenger til arbeidstaker som lider av en langvarig eller kronisk sykdom.\n\nDette skjemaet bruker du hvis du vil søke om at arbeidsgiver fritas for plikten til å utbetale sykepenger i arbeidsgiverperioden',
        url: 'https://www.nav.no/soknader/nb/person/helse/sykepenger#NAV082005',
        language: 'nb',
    },
    {
        displayName: 'Søknad om unntak fra arbeidsgiveransvar for sykepenger til en arbeidstaker som har sykefravær på grunn av svangerskap - NAV 08-20.20',
        description:
            'Dette skjemaet brukes til å søke om unntak fra arbeidsgiveransvar for sykepenger til en arbeidstaker som har sykefravær på grunn av svangerskap, og som ikke kan omplasseres til annet arbeid i virksomheten.',
        url: 'https://www.nav.no/soknader/nb/person/helse/sykepenger#NAV082020',
        language: 'nb',
    },
    {
        displayName: 'Søknad fra selvstendig næringsdrivende/frilansere om opptak/endring i forsikring for tillegg til sykepenger - NAV 08-36.05',
        description: 'Dette skjemaet bruker du dersom du er selvstendig næringsdrivende eller frilanser, og vil søke om forsikring for tillegg til sykepenger.',
        url: 'https://www.nav.no/soknader/nb/person/helse/sykepenger#NAV083605',
        language: 'nb',
    },
    {
        displayName: 'Søknad om å beholde sykepenger under opphold i utlandet - NAV 08-09.07',
        description:
            'Denne søknaden bruker du hvis du ønsker å reise ut av Norge mens du er sykmeldt og du samtidig ønsker å beholde sykepengene. Du må sende søknaden før du reiser.\n\nSkal du avvikle lovbestemt ferie utenfor Norge, skal du ikke søke. I stedet krysser du av for ferie i søknaden om sykepenger som sendes etter at sykmeldingsperioden er over.',
        url: 'https://www.nav.no/soknader/nb/person/helse/sykepenger#NAV080907',
        language: 'nb',
    },
    {
        displayName: 'Søknad om pleiepenger for pleie av sykt barn - NAV 09-11.05',
        description:
            'Hvis du søker om pleiepenger for sykt barn, skal sykehuslegen/lege i spesialisthelsetjenesten som har ansvaret for behandlingen av barnet fylle ut og signere legeerklæringen på søknadsskjema NAV 09-11.05. Skjemaet må også fylles ut og signeres av søkeren og sendes til NAV. Hvis du er arbeidstaker, skal arbeidsgiver sende opplysninger om inntekten din til NAV digitalt.',
        url: 'https://www.nav.no/soknader/nb/person/helse/omsorgspenger-pleiepenger-og-opplaringspenger#NAV091105',
        language: 'nb',
    },
    {
        displayName: 'Søknad om pleiepenger ved pleie i hjemmet av nærstående i livets sluttfase - NAV 09-12.05',
        description:
            'Hvis du skal søke om pleiepenger for nærstående i livets sluttfase, skal legen eller den helseinstitusjonen som har behandlet pasienten, fylle ut legeerklæring på søknadsskjemaet NAV 09-12.05. Den pleietrengende skal i skjemaet samtykke til pleien. Skjemaet må også fylles ut og signeres av søkeren, og sendes til NAV.\n\nHvis du er arbeidstaker, skal arbeidsgiver sende opplysninger om inntekten din til NAV digitalt.',
        url: 'https://www.nav.no/soknader/nb/person/helse/omsorgspenger-pleiepenger-og-opplaringspenger#NAV091205',
        language: 'nb',
    },
    {
        displayName: 'Søknad om opplæringspenger - NAV 09-11.08',
        description:
            'Hvis du skal søke om opplæringspenger, skal helseinstitusjonen, lege eller det kompetansesenteret som er ansvarlig for opplæringen fylle ut og signere legeerklæring (del 2 og 3) på søknadsskjemaet NAV 09-11.08. Skjemaet må også fylles ut og signeres av søkeren(e), og sendes til NAV.\n\nDersom du er arbeidstaker skal arbeidsgiver sende opplysninger om inntekten din til NAV.',
        url: 'https://www.nav.no/soknader/nb/person/helse/omsorgspenger-pleiepenger-og-opplaringspenger#NAV091108',
        language: 'nb',
    },
    {
        displayName: 'Søknad om flere omsorgsdager / melding om fordeling og overføring av dagene - NAV 09-06.05',
        description:
            'Dersom du har kronisk syke eller funksjonshemmede barn under 18 år, kan du få øket antall stønadsdager med omsorgspenger. Du bruker dette skjemaet for å søke om forhåndsgodkjenning av øket antall stønadsdager.\n\nHvis du skal søke om flere omsorgsdager fordi du har et kronisk sykt eller funksjonshemmet barn, skal barnets lege fylle ut og signere legeerklæringen i søknadskjemaet NAV 09-06.05. Skjemaet må også fylles ut og signeres av søkeren(e), og sendes til NAV.\n\nDu bruker det samme skjemaet hvis du er alene om omsorgen eller vil fordele/overføre omsorgsdager.\n\nHvis du er arbeidstaker, skal arbeidsgiver sende opplysninger om inntekten din til NAV',
        url: 'https://www.nav.no/soknader/nb/person/helse/omsorgspenger-pleiepenger-og-opplaringspenger#NAV090605',
        language: 'nb',
    },
    {
        displayName:
            'Inntektsopplysninger for selvstendig næringsdrivende og/eller frilansere som skal ha omsorgs-, pleie- eller opplæringspenger - NAV 09-35.01',
        description:
            'Dette skjemaet skal du fylle ut når du skal søke om omsorgs-, opplærings- eller pleiepenger fra NAV.\n\nHvis du i løpet av de siste fire årene har startet næringsvirksomhet eller fått en varig endring av arbeidssituasjonen/virksomheten, må du dokumentere dette. \n\nHvis du er jordbruker, må du også legge ved RF-skjema 1224 fra skatteetaten som viser hvor mye av næringsinntekten som utgjør jordbruksinntekten.\n\nNB: En av legeerklæringene må følge søknaden.',
        url: 'https://www.nav.no/soknader/nb/person/helse/omsorgspenger-pleiepenger-og-opplaringspenger#NAV093501',
        language: 'nb',
    },
    {
        displayName: 'Melding om yrkesskade eller yrkessykdom som er påført under arbeid på norsk eller utenlandsk landterritorium - NAV 13-07.05',
        description: 'Jeg vil melde i fra om skade eller sykdom som skyldes jobben min i Norge eller et annet land.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkesskade#NAV130705',
        language: 'nb',
    },
    {
        displayName: 'Report of occupational injury or occupational illness sustained in connection with petroleum activities at sea - NAV 13-06.05',
        description: 'You use this form when you want to report an injury or disease which has occurred during petroleum activities at sea.',
        url: 'https://www.nav.no/soknader/en/person/helse/yrkesskade#NAV130605',
        language: 'en',
    },
    {
        displayName: 'Melding om yrkesskade eller yrkessykdom som er påført i forbindelse med petroleumsvirksomhet til havs - NAV 13-06.05',
        description: 'Jeg vil melde i fra om skade eller sykdom som skyldes jobben min i oljenæringen til havs.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkesskade#NAV130605',
        language: 'nb',
    },
    {
        displayName:
            'Report on occupational injury / personal injury sustained in the course of duties on board ship or during fishing/catching - NAV 13-07.08',
        description:
            'You use this form when you want to report an injury or disease which has occurred during duties on board ship or during fishing/ hunting at sea',
        url: 'https://www.nav.no/soknader/en/person/helse/yrkesskade#NAV130708',
        language: 'en',
    },
    {
        displayName: 'Melding om yrkesskade eller yrkessykdom som er påført under tjeneste på skip eller under fiske/fangst - NAV 13-07.08',
        description: 'Jeg skal melde fra om skade eller sykdom mens jeg jobbet på skip eller drev med fiske/fangst.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkesskade#NAV130708',
        language: 'nb',
    },
    {
        displayName: 'Melding om yrkesskade eller yrkessykdom som er påført eller oppstått under militær tjenestegjøring - NAV 13-08.05',
        description: 'Jeg skal melde fra om skade eller sykdom mens jeg tjenestegjorde i militæret.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkesskade#NAV130805',
        language: 'nb',
    },
    {
        displayName: 'Melding om yrkesskade eller yrkessykdom påført elev/student - NAV 13-10.01',
        description: 'Jeg skal melde fra om skade eller sykdom mens jeg var elev eller student på skole, høgskole eller universitet.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkesskade#NAV131001',
        language: 'nb',
    },
    {
        displayName: 'Søknad om menerstatning - NAV 13-17.05',
        description: 'Jeg vil søke om menerstatning.\n\nGjelder kun dersom du har fått varig men på grunn av godkjent yrkesskade eller yrkessykdom.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkesskade#NAV131705',
        language: 'nb',
    },
    {
        displayName: 'Skadeforklaring ved arbeidsulykke - NAV 13-00.21',
        description: 'Jeg vil gi flere opplysninger om en arbeidsulykke.\n\nDette gjelder kun når du skal sende skadeforklaring og gi flere opplysninger.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkesskade#NAV130021',
        language: 'nb',
    },
    {
        displayName: 'Søknad fra selvstendig næringsdrivende og frilansere om opptak i frivillig trygd med rett til særytelser ved yrkesskade - NAV 13-13.05',
        description:
            'Jeg vil søke om frivillig trygdeordning for å få rett til særytelser på grunn av yrkesskade.\n\nDette gjelder kun for selvstendig næringsdrivende.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkesskade#NAV131305',
        language: 'nb',
    },
    {
        displayName: 'Opplysninger om skadelig påvirkning i arbeid - NAV 13-04.20',
        description: 'Dette skjemaet bruker du når du skal gi flere opplysninger om skadelig påvirkning du har vært utsatt for i arbeid.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkessykdom-tilleggsopplysninger#NAV130420',
        language: 'nb',
    },
    {
        displayName: 'Opplysninger om asbestbruk i arbeid - NAV 13-04.21',
        description: 'Dette skjemaet bruker du når du vil gi opplysninger om asbestpåvirkning i arbeid.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkessykdom-tilleggsopplysninger#NAV130421',
        language: 'nb',
    },
    {
        displayName: 'Opplysninger om bruk av løsemidler i arbeid - NAV 13-04.22',
        description: 'Dette skjemaet bruker du hvis du vil gi opplysninger om bruk av løsemidler i arbeid.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkessykdom-tilleggsopplysninger#NAV130422',
        language: 'nb',
    },
    {
        displayName: 'Opplysninger om støvpåvirkning i arbeid - NAV 13-04.23',
        description: 'Dette skjemaet bruker du hvis du skal gi opplysninger om støvpåvirkning i arbeid.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkessykdom-tilleggsopplysninger#NAV130423',
        language: 'nb',
    },
    {
        displayName: 'Opplysninger om larmpåvirkning i arbeid - NAV 13-04.24',
        description: 'Dette skjemaet bruker du hvis du skal gi opplysninger om larmpåvirkning i arbeid.',
        url: 'https://www.nav.no/soknader/nb/person/helse/yrkessykdom-tilleggsopplysninger#NAV130424',
        language: 'nb',
    },
    {
        displayName: 'Søknad om stønad til arbeids- og utdanningsreiser - NAV 10-00.42',
        description:
            'Gjelder kun dersom du har varige problemer med å bruke offentlig transport til arbeid eller arbeidsrettet utdanning, og er avhengig av annen transport.\n\nMottar du arbeidsavklaringspenger eller tiltakspenger og deltar i arbeidsrettet tiltak skal du benytte skjema for tilleggsstønader.',
        url: 'https://www.nav.no/soknader/nb/person/helse/arbeids-og-utdanningsreiser#NAV100042',
        language: 'nb',
    },
    {
        displayName: 'Søknad om lese- og sekretærhjelp for blinde og svaksynte - NAV 10-07.30',
        description: 'Jeg vil søke om stønad til lese- og sekretærhjelp fordi jeg er blind eller svaksynt.\n\n\n\n',
        url: 'https://www.nav.no/soknader/nb/person/helse/lese-og-sekretarhjelp#NAV100730',
        language: 'nb',
    },
    {
        displayName: 'Regning for lese- og sekretærhjelp for blinde og svaksynte - NAV 10-07.09',
        description: 'Jeg vil sende regning for utført lese- og sekretærhjelp.',
        url: 'https://www.nav.no/soknader/nb/person/helse/lese-og-sekretarhjelp#NAV100709',
        language: 'nb',
    },
    {
        displayName: 'Application for disability benefits - NAV 12-06.05',
        description:
            'If your earning ability (ability to obtain income from work) is permanently reduced due to illness or injury, you may be entitled to disability benefits. It must be clarified with NAV that you are not able to be at work before applying for disability benefits.',
        url: 'https://www.nav.no/soknader/en/person/helse/uforetrygd#NAV120605',
        language: 'en',
    },
    {
        displayName: 'Søknad om uføretrygd - NAV 12-06.05',
        description:
            'Du kan ha rett til uføretrygd hvis du har en varig nedsatt inntektsevne på grunn av sykdom eller skade. Før du søker må du har fått avklart med NAV at du ikke kan være i arbeid.\n\nHvis du er delvis i arbeid må du legge ved tilleggsskjema til søknaden din. Dette gjelder også om du ønsker å søke om barnetillegg.',
        url: 'https://www.nav.no/soknader/nb/person/helse/uforetrygd#NAV120605',
        language: 'nb',
    },
    {
        displayName: 'Change of income form - for those receiving disability benefits - NAV 12-14.01',
        description: 'If you combine disability benefits and employment the easiest way to submit changes is online.',
        url: 'https://www.nav.no/soknader/en/person/helse/inntektsendring-uforetrygd#NAV121401',
        language: 'en',
    },
    {
        displayName: 'Skjema for inntektsendring – for deg som har uføretrygd - NAV 12-14.01',
        description:
            'Når du ikke har barnetillegg, bruker du dette skjemaet for å melde fra om endringer i inntekten som kan ha betydning for uføretrygden din.',
        url: 'https://www.nav.no/soknader/nb/person/helse/inntektsendring-uforetrygd#NAV121401',
        language: 'nb',
    },
    {
        displayName: 'Change of income form - for those who receive child allowance linked to disability benefit - NAV 12-16.01',
        description: 'This form is used to report changes in income that may affect your child allowance or disability benefits.',
        url: 'https://www.nav.no/soknader/en/person/helse/inntektsendring-uforetrygd#NAV121601',
        language: 'en',
    },
    {
        displayName: 'Skjema for inntektsendring – for deg som har barnetillegg til uføretrygden - NAV 12-16.01',
        description: 'Dette skjemaet bruker du for å melde inn endringer i alle typer inntekt som kan ha betydning for barnetillegget og uføretrygden din.',
        url: 'https://www.nav.no/soknader/nb/person/helse/inntektsendring-uforetrygd#NAV121601',
        language: 'nb',
    },
    {
        displayName: 'Application for child supplement – disability benefits - NAV 12-15.01',
        description:
            'If you have applied for or are receiving disability benefits and you support spouse and/or children, you may apply for child supplement when the family has a combined income below a certain level.',
        url: 'https://www.nav.no/soknader/en/person/helse/barnetillegg-uforetrygd#NAV121501',
        language: 'en',
    },
    {
        displayName: 'Søknad om barnetillegg for deg som har uføretrygd - NAV 12-15.01',
        description:
            'Du kan søke om barnetillegg til uføretrygden hvis du forsørger barn under 18 år. Barnetillegget blir behovsprøvd ut fra begge foreldrenes inntekt. Hvis du ikke bor sammen med den andre forelderen til barnet, blir barnetillegget behovsprøvd ut fra inntekten din.',
        url: 'https://www.nav.no/soknader/nb/person/helse/barnetillegg-uforetrygd#NAV121501',
        language: 'nb',
    },
];

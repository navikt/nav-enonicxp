const libs = {
    thymeleaf: require('/lib/xp/thymeleaf'),
    enhetsInfoCache: require('/lib/enhetsInfoCache'),
    portal: require('/lib/xp/portal'),
};

const view = resolve('alle-enheter.html');
const PAGESIZE = 20;
const letters = 'abcdefghijklmnopqrstuvwxyzæøå';

exports.get = function (req) {
    const filter = getFilters(req.params);
    const alle = libs.enhetsInfoCache
        .get('alleEnheter')
        .sort((a, b) => {
            return a.navn.localeCompare(b.navn, 'no');
        })
        .reduce((t, element) => {
            t.push(filter.county(filter.letter(element)));
            return t;
        }, [])
        .reduce(standardFilter, [])
        .reduce((t, element) => {
            if (element) {
                t.push(element);
            }
            return t;
        }, []);
    const alleEnheter = alle
        .reduce((t, element, index) => {
            if (filter.page(element, index)) {
                t.push(element);
            }
            return t;
        }, [])
        .map(element => {
            const k = libs.enhetsInfoCache.get('kontaktinformasjon', element.enhetNr);
            return {
                href: libs.portal.pageUrl({
                    path: '/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontakt-oss/kontorer/nav-rygge',
                    params: {
                        eid: element.enhetNr,
                    },
                }),
                phone: parsePhoneNumber(k.telefonnummer),
                description: k.publikumsmottak[0].stedsbeskrivelse,
                name: element.navn,
            };
        });
    const footer = fixFooter(alle, req.params.letter, libs.portal.getContent()._id, req.params.page);
    const model = {
        offices: alleEnheter,
        footer: footer,
        hasFooter: footer.length > 1,
        letters: letters
            .toUpperCase()
            .split('')
            .map(value => {
                return {
                    letter: value,
                    url: libs.portal.pageUrl({
                        id: libs.portal.getContent()._id,
                        params: {
                            letter: value,
                        },
                    }),
                };
            }),
    };
    const body = libs.thymeleaf.render(view, model);

    return {
        body: body,
    };
};

const counties = {
    Hedmark: '04',
};

function fixFooter (alleElementer, letter, id, page) {
    return alleElementer
        .reduce((t, el) => {
            const elementFilter = letter ? letterFilter(letter) : noFilter;
            const element = elementFilter(el);
            if (element) {
                t.push(element);
            }
            return t;
        }, [])
        .reduce((t, el, index, arr) => {
            if (index % PAGESIZE === 0) {
                t.push(el.navn.replace('NAV ', '').substring(0, 2) + '-');
            } else if (index % PAGESIZE === PAGESIZE - 1 || index === arr.length - 1) {
                t[t.length - 1] = t[t.length - 1] + el.navn.replace('NAV ', '').substring(0, 2);
            }
            return t;
        }, [])
        .map((el, index) => {
            const p = (index + 1).toString();
            const params = letter
                ? {
                    letter: letter,
                    page: p,
                }
                : {
                    page: p,
                };
            return {
                tag: el,
                href: libs.portal.pageUrl({
                    id: id,
                    params: params,
                }),
            };
        })
        .reduce((t, el, index) => {
            let pag = parseInt(page);
            pag = isNaN(pag) ? 1 : pag;
            if (index < pag + 3 && index > pag - 3) {
                t.push(el);
            } else if (index === pag - 5 || index === pag + 5) {
                el.tag = '...';
                t.push(el);
            }
            return t;
        }, []);
}

function getFilters (params) {
    return {
        page: params.page ? pageFilter(parseInt(params.page)) : pageFilter(1),
        county: params.county ? countyFilter(params.county) : noFilter,
        letter: params.letter ? letterFilter(params.letter) : noFilter,
    };
}

function pageFilter (page) {
    return function (element, index) {
        if (!element) {
            return false;
        }
        return index + 1 > PAGESIZE * page - PAGESIZE && index + 1 <= PAGESIZE * page;
    };
}

function noFilter (element) {
    return element;
}

function countyFilter (county) {
    return function (element) {
        if (!element) {
            return false;
        }
        return libs.enhetsInfoCache.getCounty(element.postaddresse).kommunenummer.substring(0, 1) === counties[county] ? element : false;
    };
}
function letterFilter (letter) {
    return function (element) {
        if (!element) {
            return false;
        }
        return element.navn.startsWith('NAV ' + letter.toUpperCase()) ? element : false;
    };
}

function standardFilter (t, el) {
    if (el.status === 'Aktiv' && el.type === 'LOKAL') {
        t.push(el);
    }
    return t;
}

function parsePhoneNumber (number) {
    return number
        ? number.split('').reduce((t, e, i) => {
            t += e + (i % 2 === 1 ? ' ' : '');
            return t;
        }, '')
        : null;
}

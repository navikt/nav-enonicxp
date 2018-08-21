var portal = require('/lib/xp/portal');
var thymeleaf = require('/lib/xp/thymeleaf');
var cache = require('/lib/enhetsInfoCache');
var PAGESIZE = 20;
var view = resolve('alle-enheter.html');
var letters = 'abcdefghijklmnopqrstuvwxyzæøå';
exports.get = function (req) {
    var filter = getFilters(req.params);
    var alle = cache.get('alleEnheter').sort(function(a,b){ // sorterer fra a-å
       /* var na = a.navn.toLowerCase().split('');
        var nb = b.navn.toLowerCase().split('');
        var al;
        var bl;
        while ((al = na.shift()) === (bl = nb.shift()) && al && bl){}

        return (letters.split('').indexOf(al) || 0) - (letters.indexOf(bl) || 0)*/
       return a.navn.localeCompare(b.navn, 'no');
    }).reduce(function (t, element) {
        t.push(filter.county(filter.letter(element)));
        return t;
    }, []).reduce(standardFilter
    ,[]).reduce(function (t, element) {
       if (element) t.push(element);
       return t;
    },[]);
    var alleEnheter = alle.reduce(function (t, element, index) {
        if (filter.page(element, index)) t.push(element);
        return t;
    },[]).map(function(element) {
        var k = cache.get('kontaktinformasjon', element.enhetNr);
        return {
            href: portal.pageUrl({
                path: '/www.nav.no/no/nav-og-samfunn/kontakt-nav/kontakt-oss/kontorer/nav-rygge',
                params: {
                    eid: element.enhetNr
                }
            }),
            phone: parsePhoneNumber(k.telefonnummer),
            description: k.publikumsmottak[0].stedsbeskrivelse,
            name: element.navn
        }
    });
    var footer = fixFooter(alle, req.params.letter, portal.getContent()._id, req.params.page);
    var model = {offices:
        alleEnheter,
        footer: footer,
        hasFooter: footer.length > 1,
        letters: letters.toUpperCase().split('').map(function (value) {
            return {
                letter: value,
                url: portal.pageUrl({
                    id: portal.getContent()._id,
                    params: {
                        letter: value
                    }
                })
            }
        })};
    var body = thymeleaf.render(view, model);

    return {
        body: body
    }
};

var counties = {
    Hedmark: '04'
};

function fixFooter(alleElementer, letter, id, page) {
    return alleElementer.reduce(function (t, el, index) {
        var elementFilter = letter ? letterFilter(letter) : noFilter;
        var element = elementFilter(el);
        if (element) t.push(element);
        return t;
    },[]).reduce(function (t, el, index, arr) {
        if (index % PAGESIZE === 0) {
            t.push(el.navn.replace('NAV ', '').substring(0,2) + '-');
        }
        else if (index % PAGESIZE === PAGESIZE -1 || index === arr.length-1) t[t.length - 1] = t[t.length-1] + el.navn.replace('NAV ', '').substring(0,2);
        return t;
    }, []).map(function (el, index) {
        var p = (index+1).toString();
        var params = letter ? {letter: letter, page: p } : {page: p};
        return {
            tag: el,
            href: portal.pageUrl({
                id: id,
                params: params
            })
        }
    }).reduce(function(t, el, index) {
        var pag = parseInt(page);
        pag = isNaN(pag) ? 1 : pag;
        if (index < pag + 3 && index > pag - 3) {
            t.push(el);
        }
        else if (index === pag -5 || index === pag + 5) {
            el.tag = '...';
            t.push(el);
        }
        return t;
    }, [])
}

function getFilters(params) {
    var filters = {};
    filters.page = params.page ? pageFilter(parseInt(params.page)) : pageFilter(1);
    filters.county = params.county ? countyFilter(params.county) : noFilter;
    filters.letter = params.letter ? letterFilter(params.letter) : noFilter;
    return filters;
}

function pageFilter(page) {
    return function (element, index) {
        if (!element) return false;
        return (index +1 > (PAGESIZE * page) - PAGESIZE && index + 1 <= PAGESIZE * page);
    }
}

function noFilter(element) {
    return element;
}

function countyFilter(county) {
    return function (element) {
        if (!element) return false;
        return cache.getCounty(element.postaddresse).kommunenummer.substring(0,1) === counties[county] ? element: false;
    }
}
function letterFilter(letter) {
    return function (element) {
        if (!element) return false;
        return element.navn.startsWith("NAV " + letter.toUpperCase()) ? element : false
    }
}

function standardFilter(t, el) {
    if (el.status === 'Aktiv' && el.type === 'LOKAL') t.push(el);
    return t;
}

function parsePhoneNumber(number) {
    return number ? number.split('').reduce(function(t,e,i){
        t += e + (i%2 === 1 ? ' ' : '');
        return t;
    },'') : null
}
const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    navUtils: require('/lib/nav-utils'),
    cache: require('/lib/siteCache'),
};

const dagArr = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
const view = resolve('office-information.html');
function handleGet (req) {
    return libs.cache.getPaths(req.rawPath, 'office-information', req.branch, () => {
        const content = libs.portal.getContent();
        const lang = {
            closed: 'stengt',
        };

        const kontaktInformasjon = content.data.kontaktinformasjon || {
            besoeksadresse: undefined,
            postaddresse: undefined,
            faksnummer: undefined,
            telefonnummer: undefined,
            telefonnummerKommentar: undefined,
            publikumsmottak: undefined,
            epost: undefined,
            spesielleOpplysninger: undefined,
        };
        const postadresse = kontaktInformasjon.postadresse;
        const postAdr = formatAddress(postadresse, false);
        let publikumsmottak = kontaktInformasjon.publikumsmottak;
        publikumsmottak = publikumsmottak ? Array.isArray(publikumsmottak) ? publikumsmottak : [publikumsmottak] : [];
        const type = content.data.enhet.type;
        const besoeksadresse = formatAddress(kontaktInformasjon.besoeksadresse, true);
        const epost = parseEmail(kontaktInformasjon.epost);
        const specialInfo = parseSpecialInfo(kontaktInformasjon.spesielleOpplysninger);

        const enhet = {
            navn: `${content.data.enhet.navn} - kontorinformasjon`,
            orgNr: content.data.enhet.organisasjonsnummer,
            kontornr: content.data.enhet.enhetNr,
            postaddresse: postAdr,
            poststed: postadresse ? postadresse.poststed.toUpperCase() : '',
            postnummer: postadresse ? postadresse.postnummer : '',
            faks: parsePhoneNumber(kontaktInformasjon.faksnummer),
            telefon: parsePhoneNumber(kontaktInformasjon.telefonnummer),
            telefonkommentar: kontaktInformasjon.telefonnummerKommentar,
            pms: publikumsmottak.map(val => formatAudienceReception(val, content.language)),
            isHmsOrAls: type === 'HMS' || type === 'ALS' || type === 'TILTAK',
            besoeksadresse,
            epost,
            spesielleOpplysninger: specialInfo, 
        };

        const body = libs.thymeleaf.render(view, {
            content,
            published: libs.navUtils.dateTimePublished(content, content.language || 'no'),
            enhet,
            lang,
        });

        return {
            contentType: 'text/html',
            body: body,
            pageContributions: {
                headEnd: [
                    `<link rel="stylesheet" href="${libs.portal.assetUrl({
                        path: 'styles/enhetsinfo/enhetsinfo.css',
                    })}" />`,
                ],
            },
        };
    });
}

exports.get = handleGet;

function formatAudienceReception (audienceReception, language = 'no') {
    let aapningstider = libs.navUtils.forceArray(audienceReception.aapningstider);

    // filter regular and exceptions for opening hour then introduce formatting for display
    aapningstider = aapningstider.reduce((acc, elem) => {
        if (elem.dato) {
            elem.isoDate = elem.dato;
            elem.dato = libs.navUtils.formatDate(elem.dato, language);
            if (elem.fra && elem.til) {
                elem.a = elem.fra + ' - ' + elem.til;
            }
            acc.exceptions.push(elem);
        } else {
            let displayVal = formatMetaOpeningHours(elem);
            displayVal.a = displayVal.fra + ' - ' + displayVal.til;
            acc.regular.push(displayVal);
        }
        return acc;
    }, {
        regular: [], exceptions: [],
    });

    return {
        besokkom: formatAddress(audienceReception.besoeksadresse, true),
        stedbeskrivelse: audienceReception.stedsbeskrivelse || audienceReception.besoeksadresse.poststed,
        unntakAapning: aapningstider.exceptions,
        apning: aapningstider.regular
            .sort(sortOpeningHours),
    };
}

function formatMetaOpeningHours (el) {
    let day;
    if (el.dag === 'Mandag') {
        day = 'Mo';
    } else if (el.dag === 'Tirsdag') {
        day = 'Tu';
    } else if (el.dag === 'Onsdag') {
        day = 'We';
    } else if (el.dag === 'Torsdag') {
        day = 'Th';
    } else if (el.dag === 'Fredag') {
        day = 'Fr';
    }
    el.meta = `${day} ${el.fra}-${el.til}`;
    return el;
}

function sortOpeningHours (a, b) {
    return dagArr.indexOf(a.dag) - dagArr.indexOf(b.dag);
}

function formatAddress (address, withZip) {
    if (!address) {
        return '';
    }
    let formatedAddress;
    if (address.type === 'postboksadresse') {
        const postboksanlegg = address.postboksanlegg ? ` ${address.postboksanlegg}` : '';
        formatedAddress = `Postboks ${address.postboksnummer}${postboksanlegg}`;
    } else {
        const husnummer = address.husnummer ? ` ${address.husnummer}` : '';
        const husbokstav = address.husbokstav ? `${address.husbokstav}` : '';
        formatedAddress = `${address.gatenavn}${husnummer}${husbokstav}`;
    }
    if (withZip) {
        formatedAddress += `, ${address.postnummer} ${address.poststed.toUpperCase()}`;
    }
    return formatedAddress;
}

function parsePhoneNumber (number, mod) {
    mod = mod || 2;
    return number
        ? number.replace(/ /g, '').split('').reduce((t, e, i) => {
            t += e + (i % mod === 1 ? ' ' : '');
            return t;
        }, '')
        : null;
}

function isBalanced(str) {
    return (str.match(/{/g) || []).length === (str.match(/}/g) || []).length; 
}

function isTextClean(str) {
    // checks for curlies in the string.
    return str.split('{').length < 2 && str.split('}').length < 2;
}

function specialInfoParseLink (infoContent) {
    const pattern = /\{((.*?):(.*?))\}/g;
    let result = [];

    let match = pattern.exec(infoContent);
    while (match !== null) {
        // Only correctly formatted urls should be turned into a-tags, so
        // check if the match has balanced curlies and that description is 'OK'
        if (isBalanced(match[0]) && isTextClean(match[2])) {
            result.push({
                match: match[0],
                text: match[2],
                url: match[3],
                start: match.index,
                end: pattern.lastIndex,
            });
        }
        match = pattern.exec(infoContent);
    }
    return result;
}

function parseSpecialInfo (infoContent) {
    let parsedString = infoContent;
    if (! parsedString) {
        return '';
    }
    // replace \n with <br />
    parsedString = parsedString.replace(/(?:\r\n|\r|\n)/g, '<br>');
    // replace urls
    const urls = specialInfoParseLink(parsedString);
    urls.forEach((url) => {
        parsedString = parsedString.replace(url.match, `<a href='${url.url}'>${url.text}</a>`);
    });

    return parsedString;
}


function parseEmail (emailString) {
    if (!emailString) {
        return;
    }
    let email;
    let internal = false;
    let betweenBracketsPattern = /\[(.*?)\]/g;
    let match;

    while ((match = betweenBracketsPattern.exec(emailString)) !== null) {
        let matchedRes = match[1];
        if (matchedRes.indexOf('@') !== -1) {
            email = matchedRes;
        } else if (matchedRes === 'true') {
            internal = true;
        }
    }
    if (internal) {
        return;
    }
    return email;
}

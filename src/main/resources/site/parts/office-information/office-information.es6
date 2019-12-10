const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    navUtils: require('/lib/nav-utils'),
    cache: require('/lib/cacheControll'),
};

const dagArr = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
const view = resolve('office-information.html');
function handleGet (req) {
    return libs.cache.getPaths(req.path, 'office-information', req.branch, () => {
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
        };
        const postadresse = kontaktInformasjon.postadresse;
        const postAdr = formatAddress(postadresse, false);
        let publikumsmottak = kontaktInformasjon.publikumsmottak;
        publikumsmottak = publikumsmottak ? Array.isArray(publikumsmottak) ? publikumsmottak : [publikumsmottak] : [];
        const type = content.data.enhet.type;
        const besoeksadresse = formatAddress(kontaktInformasjon.besoeksadresse, true);
        const epost = parseEmail(kontaktInformasjon.epost);

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
            pms: publikumsmottak.map(formatAudienceReception),
            isHmsOrAls: type === 'HMS' || type === 'ALS' || type === 'TILTAK',
            besoeksadresse,
            epost,
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

function formatAudienceReception (audienceReception) {
    let aapningstider = audienceReception.aapningstider;
    aapningstider = aapningstider ? Array.isArray(aapningstider) ? aapningstider : [aapningstider] : [];
    return {
        besokkom: formatAddress(audienceReception.besoeksadresse, true),
        stedbeskrivelse: audienceReception.stedsbeskrivelse || audienceReception.besoeksadresse.poststed,
        apning: aapningstider
            .map(el => {
                el.a = el.fra + ' - ' + el.til;
                return el;
            })
            .map(formatMetaOpeningHours)
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

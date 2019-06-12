const libs = {
    thymeleaf: require('/lib/xp/thymeleaf'),
    enhetsInfoCache: require('/lib/enhetsInfoCache'),
    portal: require('/lib/xp/portal'),
};

const dagArr = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
const view = resolve('office-details.html');
function handleGet (req) {
    // log.info(JSON.stringify(JSON.parse(cache.get('alleEnheter').body),null,4));

    const params = req.params;
    let enhet;
    const lang = {
        closed: 'stengt',
    };
    if (!params.hasOwnProperty('eid')) {
        return {
            redirect: libs.portal.pageUrl({
                path: '/www.nav.no',
            }),
        };
    }

    const kontaktInformasjon = libs.enhetsInfoCache.get('kontaktinformasjon', params.eid);
    const orgNr = libs.enhetsInfoCache.get('enhet', params.eid);

    if (!kontaktInformasjon || kontaktInformasjon.message) {
        return {
            redirect: libs.portal.pageUrl({
                path: '/www.nav.no/no/person',
            }),
        };
    }

    const pre = kontaktInformasjon.postadresse.type === 'postboksadresse' ? 'Postboks ' + kontaktInformasjon.postadresse.postboksnummer : kontaktInformasjon.postadresse.gatenavn;
    enhet = {
        postaddresse: pre,
        poststed: kontaktInformasjon.postadresse.poststed.toUpperCase(),
        postnummer: kontaktInformasjon.postadresse.postnummer,
        faks: parsePhoneNumber(kontaktInformasjon.faksnummer),
        orgNr: parsePhoneNumber(orgNr.organisasjonsnummer, 3),
        navn: orgNr.navn,
        kontornr: params.eid,
        pms: kontaktInformasjon.publikumsmottak.map((pm) => {
            return {
                besokkom: getBesokskontor(pm.besoeksadresse),
                stedbeskrivelse: pm.stedsbeskrivelse || pm.besoeksadresse.poststed,
                apning: pm.aapningstider.map((el) => {
                    el.a = el.fra + ' - ' + el.til;
                    return el;
                }).sort((a, b) => {
                    return dagArr.indexOf(a.dag) - dagArr.indexOf(b.dag);
                }),
            };
        }),
        telefon: parsePhoneNumber(kontaktInformasjon.telefonnummer),
        telefonkommentar: kontaktInformasjon.telefonnummerKommentar,
    };

    /* var alleEnheter = JSON.parse(cache.get('alleEnheter').body).reduce(function(t,el) {
      if (el.type === 'LOKAL' && el.status === 'Aktiv') t.push(el);
      return t;
   },[]); */
    // log.info(JSON.stringify(alleEnheter, null, 4));
    const body = libs.thymeleaf.render(view, {
        enhet: enhet, lang: lang,
    });

    return {
        contentType: 'text/html',
        body: body,
        pageContributions: {
            headEnd: [
                '<link rel="stylesheet" href="' + libs.portal.assetUrl({
                    path: 'styles/css/enhetsinfo.css',
                }) + '" />',
            ],
        },
    };
}

exports.get = handleGet;

function getBesokskontor (address) {
    return address.gatenavn + (address.husnummer ? ' ' + address.husnummer + ' ' : '') + (address.husbokstav ? ' ' + address.husbokstav : '') + ', ' + address.postnummer + ' ' + address.poststed.toUpperCase();
}

function parsePhoneNumber (number, mod) {
    mod = mod || 2;
    return number ? number.split('').reduce((t, e, i) => {
        t += e + (i % mod === 1 ? ' ' : '');
        return t;
    }, '') : null;
}

/*
 * The following DataSources were used in the original CMS portlet:

<datasources>
    <datasource name="getContent" result-element="office">
      <parameter name="contentKeys">${select(param.key, -1)}</parameter>
      <parameter name="query"/>
      <parameter name="orderBy"/>
      <parameter name="index">0</parameter>
      <parameter name="count">1</parameter>
      <parameter name="includeData">true</parameter>
      <parameter name="childrenLevel">1</parameter>
      <parameter name="parentLevel">0</parameter>
    </datasource>
  </datasources>

*/

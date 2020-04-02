exports.macro = function(context) {
    const text = context.params.varselikonOransje;

    const body =
        '<div class="alertstripe alertstripe--advarsel ">' +
            '<span class="alertstripe__ikon">' +
                '<span class="sr-only">Varselikon</span>' +
                    '<img src="/_/asset/no.nav.navno/img/varsel/alertstripe__ikon_oransje.svg" alt="varselikon">' +
                '</span>' +
                '<div class="alertstripe__tekst">' +
                    '<span>' + text + '</span>' +
                '</div>' +
        '</div>';

    return {
        body: body,
    };
};



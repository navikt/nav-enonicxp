exports.macro = function(context) {
    const text = context.params.varselikonBlaa;

    const body =
        '<div class="alertstripe alertstripe--info ">' +
            '<span class="alertstripe__ikon">' +
                '<span class="sr-only">Varselikon</span>' +
                    '<img src="/_/asset/no.nav.navno/img/varsel/alertstripe__ikon_blaa.svg" alt="varselikon">' +
                '</span>' +
                '<div class="alertstripe__tekst">' +
                     '<span>' + text + '</span>' +
                '</div>' +
            '</div>';

    return {
        body: body,
    };
};


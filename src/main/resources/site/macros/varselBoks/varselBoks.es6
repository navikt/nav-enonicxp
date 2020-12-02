const libs = {
    portal: require('/lib/xp/portal'),
};
exports.macro = function (context) {
    const text = context.params.varselBoks;
    const imageUrl = libs.portal.assetUrl({
        path: 'img/navno/alertstripe__ikon_advarsel.svg',
        type: 'absolute',
    });
    const body =
        '<div class="alertstripe alertstripe--advarsel">' +
        '<div class="alertstripe__ikon">' +
        '<span class="sr-only">advarsel</span>' +
        `<img src="${imageUrl}" alt="">` +
        '</div>' +
        '<div class="alertstripe__tekst">' +
        `<span>${text}</span>` +
        '</div>' +
        '</div>';

    return {
        body,
    };
};

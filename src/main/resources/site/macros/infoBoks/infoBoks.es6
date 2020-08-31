const libs = {
    portal: require('/lib/xp/portal'),
};
exports.macro = function (context) {
    const text = context.params.infoBoks;
    const imageUrl = libs.portal.assetUrl({
        path: 'img/navno/alertstripe__ikon_info.svg ',
    });
    const body =
        '<div class="alertstripe alertstripe--info">' +
        '<div class="alertstripe__ikon">' +
        '<span class="sr-only">Infoboks</span>' +
        `<img src="${imageUrl}" alt="infoboks">` +
        '</div>' +
        '<div class="alertstripe__tekst">' +
        `<span>${text}</span>` +
        '</div>' +
        '</div>';

    return {
        body: body,
    };
};

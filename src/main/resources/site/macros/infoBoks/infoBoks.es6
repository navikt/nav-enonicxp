const libs = {
    portal: require('/lib/xp/portal'),
};
exports.macro = function (context) {
    const text = context.params.infoBoks;
    const imageUrl = libs.portal.assetUrl({
        path: 'img/navno/alertstripe__ikon_info.svg ',
        type: 'server',
    });
    const body =
        '<div class="macroInfoBoks alertstripe alertstripe--info">' +
        '<div class="alertstripe__ikon">' +
        '<span class="sr-only">info</span>' +
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

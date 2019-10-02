const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    menuUtils: require('/lib/menu-utils'),
};

exports.get = handleGet;

function handleGet () {
    const menu = libs.menuUtils.getMegaMenu(libs.content.get({
        key: '/www.nav.no/dekorator-meny/',
    }), 5);

    return {
        body: menu,
        contentType: 'application/json',
    };
}

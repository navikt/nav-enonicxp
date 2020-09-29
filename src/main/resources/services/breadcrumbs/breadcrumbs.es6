const libs = {
    menu: require('/lib/menu-utils'),
};

const handleGet = (req) => {
    const { id } = req.params;

    const breadcrumbs = libs.menu.getBreadcrumbMenu(id);

    return {
        body: breadcrumbs,
        contentType: 'application/json',
    };
};
exports.get = handleGet;

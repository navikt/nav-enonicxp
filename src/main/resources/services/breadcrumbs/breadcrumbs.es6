const { runInBranchContext } = require('/lib/headless-utils/run-in-context');

const libs = {
    menu: require('/lib/menu-utils'),
};

const handleGet = (req) => {
    const { id, branch } = req.params;
    const breadcrumbs = runInBranchContext(
        () => libs.menu.getBreadcrumbMenu(id),
        branch || req.branch
    );

    return {
        body: breadcrumbs,
        contentType: 'application/json',
    };
};
exports.get = handleGet;

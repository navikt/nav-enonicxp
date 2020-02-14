const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
};
const view = resolve('./searchbar.html');

function get(req) {
    const ord = req.params.ord || '';
    const model = {
        ord,
        form: libs.portal.pageUrl({
            id: libs.portal.getContent()._id,
        }),
    };
    return {
        body: libs.thymeleaf.render(view, model),
    };
}

exports.get = get;

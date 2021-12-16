const portalLib = require('/lib/xp/portal');
const thymeleafLib = require('/lib/thymeleaf');
const { wipeSitecontentEntryWithReferences } = require('/lib/siteCache');

const view = resolve('./content-type-switcher.html');

const handleGet = (req) => {
    const content = portalLib.getContent();

    const model = {
        invalidate: () =>
            wipeSitecontentEntryWithReferences({
                id: content._id,
                path: content._path,
            }),
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html',
    };
};

exports.get = handleGet;

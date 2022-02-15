const portalLib = require('/lib/xp/portal');
const contentLib = require('/lib/xp/content');
const thymeleafLib = require('/lib/thymeleaf');
const { runInBranchContext } = require('/lib/utils/branch-context');

const view = resolve('./invalidate-cache.html');

const handleGet = (req) => {
    const { contentId } = req.params;

    if (!contentId) {
        return {
            body: '<widget>Ikke tilgjengelig</widget>',
            contentType: 'text/html',
        };
    }

    const content = runInBranchContext(() => contentLib.get({ key: contentId }), 'master');

    if (!content) {
        return {
            body: '<widget>Denne funksjonen er kun tilgjengelig for publisert innhold</widget>',
            contentType: 'text/html',
        };
    }

    const model = {
        invalidate: portalLib.serviceUrl({ service: 'invalidateCache' }),
        contentId,
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html',
    };
};

exports.get = handleGet;

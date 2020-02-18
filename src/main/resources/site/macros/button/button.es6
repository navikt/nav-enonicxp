const portalLib = require('/lib/xp/portal');

exports.macro = function (context) {
    const text = context.params.text;
    const href = (context.params.url) ? context.params.url : portalLib.pageUrl({
        id: context.params.content,
    });

    const body = '<p><a class="btn btn-link btn-small" href="' + href + '">' + text + '</a></p>';

    return {
        body: body,
    };
};
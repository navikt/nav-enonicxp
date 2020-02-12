const portalLib = require('/lib/xp/portal');

exports.macro = function (context) {
    const text = context.params.text;
    const href = (context.params.url) ? context.params.url : portalLib.pageUrl({
        id: context.params.content,
    });

    const body =`<p><button type="submit" class="btn btn-link btn-small" onclick="href='${href}'">${text}</button></p>`;

    return {
        body: body,
    };
};
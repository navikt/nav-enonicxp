const contentLib = require('/lib/xp/content');
const portalLib = require('/lib/xp/portal');

exports.macro = function (context) {
    const { target, text } = context.params;
    const linkText = text || contentLib.get({ key: target }).displayName;
    const url = portalLib.pageUrl({ id: target });

    return {
        body: `<a class="macroChevronLink chevron" href="${url}">${linkText}</a>`,
    };
};

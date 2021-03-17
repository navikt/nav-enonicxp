const { getBranchFromMacroContext } = require('/lib/headless/branch-context');
const { runInBranchContext } = require('/lib/headless/branch-context');

const libs = {
    content: require('/lib/xp/content'),
    utils: require('/lib/nav-utils'),
};

exports.macro = function (context) {
    const branch = getBranchFromMacroContext(context);
    const text = context.params.text || '';
    const fileLinks = libs.utils
        .forceArray(context.params.files)
        .map((id) => {
            const fileContent = runInBranchContext(() => libs.content.get({ key: id }), branch);
            const fileExt = fileContent._path.split('.').slice(-1)[0];
            return `<a href="${fileContent._path}" aria-label="${text} ${fileExt}">[${fileExt}]</a>`;
        })
        .join('&nbsp;');
    return {
        body: `<span class="macroLenkeFiler">${text}&nbsp;${fileLinks}</span>`,
    };
};

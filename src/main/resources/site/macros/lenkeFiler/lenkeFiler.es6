const { getBranchFromMacroContext } = require('/lib/headless/branch-context');
const { runInBranchContext } = require('/lib/headless/branch-context');

const libs = {
    portal: require('/lib/xp/content'),
    utils: require('/lib/nav-utils'),
};

exports.macro = function (context) {
    const branch = getBranchFromMacroContext(context);
    const text = context.params.text || '';
    const fileLinks = libs.utils
        .forceArray(context.params.files)
        .map((id) => {
            const link = runInBranchContext(
                () =>
                    libs.portal.attachmentUrl({
                        id,
                        download: true,
                    }),
                branch
            );
            const fileExt = link.split('.').pop();

            return `<a href="${link}" aria-label="${text} ${fileExt}">[${fileExt}]</a>`;
        })
        .join('&nbsp;');
    return {
        body: `<span class="macroLenkeFiler">${text}&nbsp;${fileLinks}</span>`,
    };
};

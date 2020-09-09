const libs = {
    portal: require('/lib/xp/portal'),
};
exports.macro = function (context) {
    const text = context.params.text;
    const fileLinks = context.params.files
        .map((id) => {
            const link = libs.portal.attachmentUrl({
                id,
                download: true,
            });
            const fileExt = link.split('.').pop();
            return `<a href="${link}" aria-label="${text} ${fileExt}">[${fileExt}]</a>`;
        })
        .join('&nbsp;');
    return {
        body: `<span>${text}&nbsp;${fileLinks}</span>`,
    };
};

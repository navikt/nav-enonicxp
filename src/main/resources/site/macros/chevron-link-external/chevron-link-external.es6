exports.macro = function (context) {
    const { url, text } = context.params;

    return {
        body: `<a class="macroChevronLink chevron" href="${url}">${text}</a>`,
    };
};

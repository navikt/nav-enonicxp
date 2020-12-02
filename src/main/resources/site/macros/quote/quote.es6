exports.macro = function (context) {
    return {
        body: `<blockquote class="macroQuote"><p>${context.params.quote}</p></blockquote>`,
    };
};

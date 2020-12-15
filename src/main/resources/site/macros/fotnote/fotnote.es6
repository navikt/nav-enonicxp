exports.macro = function (context) {
    return {
        body: `<sup class="macroFotnote">${context.params.fotnote}</sup>`,
    };
};

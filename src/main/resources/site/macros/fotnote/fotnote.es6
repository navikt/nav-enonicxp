exports.macro = function(context) {
    const text = context.params.fotnote;
    const body = '<sup>' + text + '</sup>';

    return {
        body: body,
    };
};

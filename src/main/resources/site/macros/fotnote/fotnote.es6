exports.macro = function (context) {
    let text = context.params.fotnote;

    let body = '<sup>' + text + '</sup>';

    return {
        body: body,
    };
};

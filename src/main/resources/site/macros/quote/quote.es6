exports.macro = function (context) {
    var text = context.params.quote;

    var body = '<blockquote><p>' + text + '</p></blockquote>';

    return {
        body: body,
    };
};

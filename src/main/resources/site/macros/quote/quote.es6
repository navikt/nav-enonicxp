exports.macro = function (context) {
    const text = context.params.quote;
    const body = '<blockquote><p>' + text + '</p></blockquote>';

    return {
        body: body,
    };
};
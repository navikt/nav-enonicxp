exports.macro = function (context) {
    const { text } = context.params;

    return {
        body: `<a class="macroChatbotLink">${text}</a>`,
    };
};

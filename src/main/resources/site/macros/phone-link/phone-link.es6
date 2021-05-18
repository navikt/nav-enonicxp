exports.macro = function (context) {
    const { text, phoneNumber, chevron } = context.params;

    return {
        body: `<a class="macroLinkPhone${
            chevron === 'true' ? ' chevron' : ''
        }" href="tel:${phoneNumber}">${text}</a>`,
    };
};

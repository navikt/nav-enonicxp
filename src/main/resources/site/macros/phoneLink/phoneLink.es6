exports.macro = function (context) {
    const { text, phoneNumber, withChevron } = context.params;

    return {
        body: `<a class="macroLinkPhone${
            withChevron ? ' chevron' : ''
        }" href="tel:${phoneNumber}">${text}</a>`,
    };
};

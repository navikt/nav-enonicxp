import { getUrlOrPage } from '/lib/menu-utils/link-utils.es6';

exports.macro = function (context) {
    const text = context.params.text;
    const href = getUrlOrPage(context.params.url, context.params.content);

    return {
        body: `<p><a class="macroButtonBlue btn btn-link btn-primary" href="${href}">${text}</a></p>`,
    };
};

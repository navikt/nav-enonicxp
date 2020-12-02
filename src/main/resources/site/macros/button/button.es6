import { getUrlOrPage } from '/lib/menu-utils/url-lookup-table.es6';

exports.macro = function (context) {
    const text = context.params.text;
    const href = getUrlOrPage(context.params.url, context.params.content);

    const body = `<p class="macroButton"><a class="btn btn-link btn" href="${href}">${text}</a></p>`;

    return {
        body: body,
    };
};

import { getUrlOrPage } from '/lib/menu-utils/url-lookup-table';

exports.macro = function(context) {
    const text = context.params.text;
    const href = getUrlOrPage(context.params.url, context.params.content);

    const body = `<p><a class="btn btn-link btn" href="${href}">${text}</a></p>`;

    return {
        body: body,
    };
};

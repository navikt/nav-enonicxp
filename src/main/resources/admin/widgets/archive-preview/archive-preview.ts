import thymeleafLib from '/lib/thymeleaf';

const view = resolve('./archive-preview.html');

export const get = (req: XP.Request) => {
    const url = `${req.scheme}://${req.host}:${req.port}/admin/site/inline/default/draft${req.params.contentPath}`;

    const model = { archivePreviewUrl: url };

    return {
        headers: {
            'X-Frame-Options': 'SAMEORIGIN',
        },
        body: thymeleafLib.render(view, model),
        contentType: 'text/html',
    };
};

exports.macro = function (context) {
    const title = context.params.title || '';
    const src = context.params.video || '';
    return {
        body: `<div class="video-container"><iframe title="${title}" src="${src}"></iframe></div>`,
    };
};

exports.macro = function (context) {
    const title = context.params.title || '';
    const src = context.params.video || '';
    return {
        body: `<div class="macroVideo video-container"><iframe title="Video: ${title}" src="${src}" allow="fullscreen"></iframe></div>`,
    };
};

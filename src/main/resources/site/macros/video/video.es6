exports.macro = function(context) {
    const body = `<div class="video-container"><iframe src="${context.params.video}" allow="fullscreen"></iframe></div>`;
    return {
        body,
    };
};

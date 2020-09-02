exports.macro = function(context) {
    const body = `<div class="video-container"><iframe src="${context.params.video}"></iframe></div>`;
    return {
        body,
    };
};

exports.macro = function(context) {
    const body = `<div class="video-container"><iframe src="${context.params.video}" allowfullscreen></iframe></div>`;
    return {
        body,
    };
};

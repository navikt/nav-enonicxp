exports.macro = function(context) {
    const text = context.params.video;
    const body = '<div class="video-container">' + text + '</div>';

    return {
        body: body,
    };
};

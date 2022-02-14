const { createGlobalValuePreview } = require('../global-value/global-value');
const { forceArray } = require('/lib/utils/nav-utils');

const previewController = (context) => {
    const { keys } = context.params;

    if (!keys) {
        return { body: '<span>Macroen er ikke konfigurert</span>' };
    }

    const previewHtml = forceArray(keys)
        .map((key) => createGlobalValuePreview(key))
        .join('<br/>');

    return {
        body: previewHtml,
    };
};

exports.macro = previewController;

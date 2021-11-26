const { getKeyWithoutMacroDescription } = require('/lib/headless/component-utils');

const macroPreview = (context) => {
    const { fragmentId } = context.params;

    if (!fragmentId) {
        return { body: '<span>Macroen er ikke konfigurert</span>' };
    }

    const contentId = getKeyWithoutMacroDescription(fragmentId);

    if (!contentId) {
        return { body: '<span>Macroen har en feil referanse - forsøk å opprette på nytt</span>' };
    }

    return {
        body: `<a href='/admin/tool/com.enonic.app.contentstudio/main#/default/edit/${contentId}' target='_blank'>Rediger fragment</a>`,
    };
};

exports.macro = macroPreview;

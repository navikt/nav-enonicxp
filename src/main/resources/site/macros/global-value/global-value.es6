const { getGvKeyAndContentIdFromUniqueKey } = require('/lib/global-values/global-values');

const macroPreview = (context) => {
    const { key } = context.params;

    if (!key) {
        return { body: '<span>Macroen er ikke konfigurert</span>' };
    }

    const { contentId } = getGvKeyAndContentIdFromUniqueKey(key);

    if (!contentId) {
        return { body: '<span>Macroen har en feil referanse - forsøk å opprette på nytt</span>' };
    }

    return {
        body: `<a href='/admin/tool/com.enonic.app.contentstudio/main#/default/edit/${contentId}' target='_blank'>Rediger verdi</a>`,
    };
};

exports.macro = macroPreview;

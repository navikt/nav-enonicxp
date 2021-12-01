const { forceArray } = require('/lib/nav-utils');
const { getGlobalValueSet } = require('/lib/global-values/global-values');
const { getGvKeyAndContentIdFromUniqueKey } = require('/lib/global-values/global-values');

const previewController = (context) => {
    const { key } = context.params;

    if (!key) {
        return { body: '<span>Macroen er ikke konfigurert</span>' };
    }

    const { contentId, gvKey } = getGvKeyAndContentIdFromUniqueKey(key);

    const globalValueSet = getGlobalValueSet(contentId);

    if (!globalValueSet) {
        return {
            body:
                '<span>Macroen refererer til et objekt som ikke finnes - forsøk å opprette på nytt</span>',
        };
    }

    const { displayName, data } = globalValueSet;

    const valueItem = forceArray(data?.valueItems).find((item) => item.key === gvKey);

    if (!valueItem) {
        return {
            body:
                '<span>Macroen refererer til en verdi som ikke finnes - forsøk å opprette på nytt</span>',
        };
    }

    const { itemName, numberValue } = valueItem;

    return {
        body: `
            <div>
                <h4>${displayName}</h4><br/>
                <h5>${itemName}</h5><br/>
                Verdi: <b>${numberValue}</b> - <a href='/admin/tool/com.enonic.app.contentstudio/main#/default/edit/${contentId}' target='_blank'>[Rediger verdi]</a>
            </div>
            `,
    };
};

exports.macro = previewController;

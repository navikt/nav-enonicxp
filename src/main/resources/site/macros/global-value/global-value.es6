const { forceArray } = require('/lib/nav-utils');
const { getGlobalValueSet } = require('/lib/global-values/global-values');
const { getGvKeyAndContentIdFromUniqueKey } = require('/lib/global-values/global-values');

const createGlobalValuePreview = (key) => {
    const { contentId, gvKey } = getGvKeyAndContentIdFromUniqueKey(key);

    const globalValueSet = getGlobalValueSet(contentId);

    if (!globalValueSet) {
        return `<span>Feil: ${contentId} er ikke en gyldig referanse til global verdier</span>`;
    }

    const { displayName, data, _path } = globalValueSet;

    const valueItem = forceArray(data?.valueItems).find((item) => item.key === gvKey);

    if (!valueItem) {
        return `<span>Feil: verdi med nøkkel ${gvKey} finnes ikke under ${displayName} (id: ${contentId})</span>`;
    }

    const { itemName, numberValue } = valueItem;

    return `
        <div>
            <span style='font-size:20px'>${displayName}</span><br/>
            <span style='color:#888888'>${_path}</span><br/>
            <a href='/admin/tool/com.enonic.app.contentstudio/main#/default/edit/${contentId}' target='_blank'>[Åpne i editoren]</a><br/>
            <br/>
            Navn: ${itemName} - Verdi: ${numberValue}
        </div>
    `;
};

const previewController = (context) => {
    const { key } = context.params;

    if (!key) {
        return { body: '<span>Macroen er ikke konfigurert</span>' };
    }

    return {
        body: createGlobalValuePreview(key),
    };
};

module.exports = { macro: previewController, createGlobalValuePreview };

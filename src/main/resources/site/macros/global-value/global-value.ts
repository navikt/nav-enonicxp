import {
    getGlobalValueSet,
    getGvKeyAndContentIdFromUniqueKey,
} from '../../../lib/global-values/global-values';
import { forceArray } from '../../../lib/utils/nav-utils';

export const createGlobalValuePreview = (key: string) => {
    const { contentId, gvKey } = getGvKeyAndContentIdFromUniqueKey(key);

    if (!contentId) {
        return `<span>Feil: ${key} er ikke en gyldig referanse til en global verdi</span>`;
    }

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

export const macro = (context: XP.MacroContext) => {
    const { key } = context.params;

    if (!key) {
        return { body: '<span>Macroen er ikke konfigurert</span>' };
    }

    return {
        body: createGlobalValuePreview(key),
    };
};

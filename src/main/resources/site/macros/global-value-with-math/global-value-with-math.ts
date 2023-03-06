import { createGlobalValueMacroPreview } from '../../../lib/global-values/macro-preview';
import { forceArray } from '../../../lib/utils/array-utils';

export const macro = (context: XP.MacroContext) => {
    const { keys } = context.params;

    if (!keys) {
        return { body: '<span>Macroen er ikke konfigurert</span>' };
    }

    const previewHtml = forceArray(keys)
        .map((key) => createGlobalValueMacroPreview(key))
        .join('<br/>');

    return {
        body: previewHtml,
    };
};

import { forceArray } from '../../../lib/utils/nav-utils';
import { createGlobalValuePreview } from '../global-value/global-value';

export const macro = (context: XP.MacroContext) => {
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

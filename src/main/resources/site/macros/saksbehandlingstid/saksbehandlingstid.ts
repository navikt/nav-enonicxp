import { createGlobalValueMacroPreview } from '../../../lib/global-values/macro-preview';

export const macro = (context: XP.MacroContext) => {
    const { key } = context.params;

    if (!key) {
        return { body: '<span>Macroen er ikke konfigurert</span>' };
    }

    return {
        body: createGlobalValueMacroPreview(key),
    };
};

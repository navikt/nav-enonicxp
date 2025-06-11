import { RequestParams } from '@enonic-types/core';
import { createGlobalValueMacroPreview } from '../../../lib/global-values/macro-preview';

export const macro = (context: { params: RequestParams }) => {
    const { key } = context.params;

    if (!key || typeof key !== 'string') {
        return { body: '<span>Macroen er ikke konfigurert</span>' };
    }

    return {
        body: createGlobalValueMacroPreview(key),
    };
};

import * as contentLib from '/lib/xp/content';
import { getKeyWithoutMacroDescription } from '../../../lib/utils/component-utils';
import { buildEditorPathFromContext } from '../../../lib/paths/editor-path';
import { RequestParams } from '@enonic-types/core';

export const macro = (context: { params: RequestParams }) => {
    const { fragmentId } = context.params;

    if (!fragmentId || 'string' !== typeof fragmentId) {
        return { body: '<span>Macroen er ikke konfigurert</span>' };
    }

    const contentId = getKeyWithoutMacroDescription(fragmentId);

    if (!contentId) {
        return { body: `<span>Feil: Ugyldig format på fragment id: ${fragmentId}</span>` };
    }

    const content = contentLib.get({ key: contentId });

    if (!content || content.type !== 'portal:fragment') {
        return { body: `<span>Feil: ${contentId} er ikke en gyldig fragment-referanse</span>` };
    }

    const { displayName, _path } = content;

    return {
        body: `
            <div>
                <span style='font-size:20px'>${displayName}</span><br/>
                <span style='color:#888888'>${_path}</span><br/>
                <a href='${buildEditorPathFromContext(
                    contentId
                )}' target='_blank'>[Åpne i editoren]</a>
            </div>
            `,
    };
};

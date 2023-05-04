import { transformToRedirectResponse } from './resolve-redirects';
import * as contentLib from '/lib/xp/content';

const legacyContentToRedirect = ['no.nav.navno:office-information'];

export const resolveLegacyContentRedirects = (content: contentLib.Content) => {
    if (!legacyContentToRedirect.includes(content.type)) {
        return;
    }

    if (content.type === 'no.nav.navno:office-information') {
        const { enhetNr } = content.data.enhet;
        const oldName = content._name;

        const foundOfficeContent = contentLib.query({
            start: 0,
            count: 1,
            contentTypes: ['no.nav.navno:office-branch'],
            filters: {
                boolean: {
                    must: {
                        hasValue: {
                            field: 'data.enhetNr',
                            values: [enhetNr],
                        },
                    },
                },
            },
        });

        if (foundOfficeContent.hits.length === 0) {
            return;
        }

        // Try and use the new office branch name, but fall back to the old name if it
        // will return a 404 after redirect.
        const office = foundOfficeContent.hits[0];

        return transformToRedirectResponse({
            content,
            target: office._path,
            type: 'internal',
            isPermanent: true,
        });
    }

    return content;
};

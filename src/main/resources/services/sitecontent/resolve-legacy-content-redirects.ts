import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { transformToRedirectResponse } from './resolve-redirects';

export const resolveLegacyContentRedirects = (content: Content) => {
    // Note: There are legacy office pages still in effect that also have the
    // content type office-information. As long as the enhetNr doesn't match up
    // with any office-branch content, the next function will pass by these
    // office pages.
    if (content.type === 'no.nav.navno:office-information') {
        const { enhetNr } = content.data.enhet;

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
            return null;
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

    return null;
};

import { transformToRedirectResponse } from './resolve-redirects';
import * as contentLib from '/lib/xp/content';

const legacyContentToRedirect = ['no.nav.navno:office-information'];

export const resolveLegacyContentRedirects = (content: contentLib.Content) => {
    if (!legacyContentToRedirect.includes(content.type)) {
        return null;
    }

    if (content.type === 'no.nav.navno:office-information') {
        const { _name } = content;
        return transformToRedirectResponse({
            content,
            target: `/kontor/${_name}`,
            type: 'internal',
            isPermanent: true,
        });
    }

    return content;
};

import { transformToRedirectResponse } from './resolve-redirects';
import * as contentLib from '/lib/xp/content';
export const legacyContentToRedirect = ['no.nav.navno:office-information'];

export const resolveLegacyContentRedirects = (content: contentLib.Content) => {
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

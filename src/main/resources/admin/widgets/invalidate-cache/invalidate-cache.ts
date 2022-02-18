import contentLib from '/lib/xp/content';
import portalLib from '/lib/xp/portal';
import thymeleafLib from '/lib/thymeleaf';
import { runInBranchContext } from '../../../lib/utils/branch-context';

const view = resolve('./invalidate-cache.html');

export const get = (req: XP.Request) => {
    const { contentId } = req.params;

    if (!contentId) {
        return {
            body: '<widget>Ikke tilgjengelig</widget>',
            contentType: 'text/html',
        };
    }

    const content = runInBranchContext(() => contentLib.get({ key: contentId }), 'master');

    if (!content) {
        return {
            body: '<widget>Denne funksjonen er kun tilgjengelig for publisert innhold</widget>',
            contentType: 'text/html',
        };
    }

    const model = {
        invalidate: portalLib.serviceUrl({ service: 'invalidateCache' }),
        contentId,
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html',
    };
};

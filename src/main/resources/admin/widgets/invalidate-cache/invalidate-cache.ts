import * as contentLib from '/lib/xp/content';
import * as portalLib from '/lib/xp/portal';
import thymeleafLib from '/lib/thymeleaf';
import { runInContext } from '../../../lib/context/run-in-context';

const view = resolve('./invalidate-cache.html');

export const get = (req: XP.Request) => {
    const { contentId } = req.params;

    if (!contentId) {
        return {
            body: '<widget>Ikke tilgjengelig</widget>',
            contentType: 'text/html',
        };
    }

    const content = runInContext({ branch: 'master' }, () => contentLib.get({ key: contentId }));

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

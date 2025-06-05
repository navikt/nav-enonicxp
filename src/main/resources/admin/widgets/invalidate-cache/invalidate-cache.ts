import { Request, Response } from '@enonic-types/core'
import * as contentLib from '/lib/xp/content';
import * as portalLib from '/lib/xp/portal';
import thymeleafLib from '/lib/thymeleaf';
import { getLayersData } from 'lib/localization/layers-data';
import { runInLocaleContext } from 'lib/localization/locale-context';

const view = resolve('./invalidate-cache.html');

export const get = (req: Request) : Response => {
    const   contentId = req.params.contentId as string,
            repository = req.params.repository as string;

    if (!contentId || !repository) {
        return {
            body: '<widget>Ikke tilgjengelig, contentId eller repository mangler</widget>',
            contentType: 'text/html',
        };
    }

    const { repoIdToLocaleMap } = getLayersData();
    const locale = repoIdToLocaleMap[repository];
    const content = runInLocaleContext({ locale, branch: 'master' }, () =>
        contentLib.get({ key: contentId })
    );

    if (!content) {
        return {
            body: '<widget>Denne funksjonen er kun tilgjengelig for publisert innhold</widget>',
            contentType: 'text/html',
        };
    }

    const model = {
        invalidate: portalLib.serviceUrl({ service: 'invalidateCache' }),
        contentId,
        locale,
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html',
    };
};

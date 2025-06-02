import { Request } from '@enonic-types/core'
import * as contentLib from '/lib/xp/content';
import * as portalLib from '/lib/xp/portal';
import thymeleafLib from '/lib/thymeleaf';
import { getLayersData } from 'lib/localization/layers-data';
import { runInLocaleContext } from 'lib/localization/locale-context';
import { forceString } from 'lib/utils/string-utils';

const view = resolve('./invalidate-cache.html');

export const get = (req: Request) => {
    const { contentId, repository } = req.params;

    if (!contentId || !repository) {
        return {
            body: '<widget>Ikke tilgjengelig, contentId eller repository mangler</widget>',
            contentType: 'text/html',
        };
    }

    const { repoIdToLocaleMap } = getLayersData();
    const locale = repoIdToLocaleMap[forceString(repository)];

    const content = runInLocaleContext({ locale, branch: 'master' }, () =>
        contentLib.get({ key: forceString(contentId) })
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

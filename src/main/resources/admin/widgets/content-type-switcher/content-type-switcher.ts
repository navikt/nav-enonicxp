import { Request } from '@enonic-types/core'
import * as contentLib from '/lib/xp/content';
import * as portalLib from '/lib/xp/portal';
import thymeleafLib from '/lib/thymeleaf';
import { contentTypesInContentSwitcher } from 'lib/contenttype-lists';
import { validateCurrentUserPermissionForContent } from 'lib/utils/auth-utils';
import { forceString } from 'lib/utils/string-utils';

const view = resolve('./content-type-switcher.html');

const getAllowedTypes = () => {
    return contentLib
        .getTypes()
        .filter((type) =>
            contentTypesInContentSwitcher.some((allowedTypeName) => allowedTypeName === type.name)
        );
};

export const get = (req: Request) => {
    const { repositoryId } = req;
    const { contentId } = req.params;

    if (!validateCurrentUserPermissionForContent(forceString(contentId), 'PUBLISH')) {
        return {
            body: '<widget>Tilgangsfeil - Du må ha publiseringstilgang for å endre innholdstype</widget>',
            contentType: 'text/html; charset=UTF-8',
        };
    }

    const model = {
        types: getAllowedTypes(),
        repoId: repositoryId,
        serviceUrl: portalLib.serviceUrl({ service: 'contentTypeSwitcher' }),
        contentId,
    };

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html',
    };
};

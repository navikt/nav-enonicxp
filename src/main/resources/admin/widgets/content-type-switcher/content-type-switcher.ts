import contentLib from '/lib/xp/content';
import portalLib from '/lib/xp/portal';
import thymeleafLib from '/lib/thymeleaf';
import { switchableContentTypes } from '../../../lib/contenttype-lists';

const view = resolve('./content-type-switcher.html');

const getAllowedTypes = () => {
    return contentLib
        .getTypes()
        .filter((type) =>
            switchableContentTypes.some((allowedTypeName) => allowedTypeName === type.name)
        );
};

export const get = (req: XP.Request) => {
    const { repositoryId } = req;
    const { contentId } = req.params;

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

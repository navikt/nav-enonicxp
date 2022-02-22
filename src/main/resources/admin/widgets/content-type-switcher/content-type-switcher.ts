import contentLib from '/lib/xp/content';
import portalLib from '/lib/xp/portal';
import thymeleafLib from '/lib/thymeleaf';

const view = resolve('./content-type-switcher.html');

const allowedTypeNames = [
    'dynamic-page',
    'content-page-with-sidemenus',
    'internal-link',
    'external-link',
    'main-article',
    'section-page',
    'page-list',
    'transport-page',
    'office-information',
    'large-table',
].map((contentType) => `${app.name}:${contentType}`);

const getAllowedTypes = () => {
    return contentLib
        .getTypes()
        .filter((type) =>
            allowedTypeNames.some((allowedTypeName) => allowedTypeName === type.name)
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

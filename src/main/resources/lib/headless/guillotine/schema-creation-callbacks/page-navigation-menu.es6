const contextLib = require('/lib/xp/context');
const contentLib = require('/lib/xp/content');
const nodeLib = require('/lib/xp/node');
const graphQlLib = require('/lib/guillotine/graphql');
const { forceArray } = require('/lib/nav-utils');

const getComponentsOnPage = (contentId) => {
    const content = contentLib.get({ key: contentId });
    const context = contextLib.get();

    const node = nodeLib
        .connect({
            repoId: context.repository,
            branch: context.branch,
        })
        .get(content?._id);

    return forceArray(node?.components);
};

const pageNavigationMenuCallback = (context, params) => {
    params.fields.anchorLinks.args = { contentId: graphQlLib.GraphQLID };
    params.fields.anchorLinks.resolve = (env) => {
        const { contentId } = env.args;
        if (!contentId) {
            log.warning(
                'Attempted to resolve a page navigation menu without providing a content id for the page'
            );
            return null;
        }

        const anchorLinkOverrides = forceArray(env.source.anchorLinks);
        const components = getComponentsOnPage(contentId);

        const anchorLinksResolved = components.reduce((linksAcc, component) => {
            const dynamicHeader = component.part?.config?.['no-nav-navno']?.['dynamic-header'];

            if (dynamicHeader?.anchorId) {
                const { anchorId, title } = dynamicHeader;
                if (linksAcc.find((link) => link.anchorId === anchorId)) {
                    return linksAcc;
                }

                const linkOverride = anchorLinkOverrides.find(
                    (linkOverride) => linkOverride.anchorId === anchorId
                );

                const anchorLink = {
                    anchorId,
                    linkText: linkOverride?.linkText || title,
                };

                return [...linksAcc, anchorLink];
            }

            return linksAcc;
        }, []);

        return anchorLinksResolved;
    };
};

module.exports = { pageNavigationMenuCallback };

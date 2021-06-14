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

const getComponentAnchorLink = (component) => {
    const dynamicHeader = component.part?.config?.['no-nav-navno']?.['dynamic-header'];
    if (dynamicHeader) {
        const { anchorId, title } = dynamicHeader;
        return anchorId && { anchorId, linkText: title };
    }

    const sectionWithHeader = component.layout?.config?.['no-nav-navno']?.['section-with-header'];
    if (sectionWithHeader) {
        const { anchorId, title } = sectionWithHeader;
        return anchorId && { anchorId, linkText: title };
    }

    const situationFlexCols = component.layout?.config?.['no-nav-navno']?.['situation-flex-cols'];
    if (situationFlexCols) {
        const { anchorId, title } = situationFlexCols;
        return anchorId && { anchorId, linkText: title };
    }

    return null;
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

        const anchorLinksResolved = components.reduce((acc, component) => {
            const anchorLink = getComponentAnchorLink(component);

            if (!anchorLink) {
                return acc;
            }

            const { anchorId } = anchorLink;

            if (acc.find((_anchorLink) => _anchorLink.anchorId === anchorId)) {
                log.warning(`Duplicate anchor id ${anchorId} found under content id ${contentId}`);
                return acc;
            }

            const linkOverride = anchorLinkOverrides.find((link) => link.anchorId === anchorId);

            return [
                ...acc,
                { ...anchorLink, ...(linkOverride && { linkText: linkOverride.linkText }) },
            ];
        }, []);

        return anchorLinksResolved;
    };
};

module.exports = { pageNavigationMenuCallback };

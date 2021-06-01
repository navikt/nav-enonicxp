const globalFragment = require('./_global');
const internalLink = require('./internalLink');
const externalLink = require('./externalLink');

const languagesMixinFragment = `
    languages {
        language
        _path
        _id
    }
`;

const linkPanelsMixinFragment = `
    panelsHeading
    panelItems {
        title
        ingress
        spanning
        url {
            text
            ref {
                ${globalFragment}
                ${internalLink.fragment}
                ${externalLink.fragment}
            }
        }
    }
`;

const seoMixinFragment = `
    metaDescription
    canonicalUrl
    noindex
`;

const decoratorTogglesMixinFragment = `
    feedbackToggle
    chatbotToggle
`;

const linkInternalMixinFragment = `
    target {
        ${globalFragment}
    }
    text
`;

const linkExternalMixinFragment = `
    url
    text
`;

const linkSelectableMixin = `
    _selected
    external {
        ${linkExternalMixinFragment}
    }
    internal {
        ${linkInternalMixinFragment}
    }
`;

const linkWithIngressMixinFragment = `
    ingress
    link {
        ${linkSelectableMixin}
    }
`;

const pageNavigationMenuMixinFragment = `
   anchorLinks(contentId:$ref) {
        anchorId
        linkText
    }
`;

const headerCommonMixin = `
    justify
    typo {
        _selected
        custom {
            typo
        }
    }
`;

const productDataMixin = `
    title
    ingress
    label
    illustration {
        ${globalFragment}
    }
`;

module.exports = {
    linkPanelsMixinFragment,
    seoMixinFragment,
    linkInternalMixinFragment,
    linkExternalMixinFragment,
    linkWithIngressMixinFragment,
    pageNavigationMenuMixinFragment,
    linkSelectableMixin,
    headerCommonMixin,
    languagesMixinFragment,
    decoratorTogglesMixinFragment,
    productDataMixin,
};

const globalFragment = require('./_global');
const internalLink = require('./internalLink');
const externalLink = require('./externalLink');
const url = require('./url');
const animatedIconsFragment = require('./animatedIcons');

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
        ${externalLink.fragment}
        ${url.fragment}
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
    taxonomy
    audience
    illustration {
        ${globalFragment}
        ${animatedIconsFragment.fragment}
    }
    externalProductUrl
`;

const situationDataMixin = `
    title
    ingress
    audience
    illustration {
        ${globalFragment}
        ${animatedIconsFragment.fragment}
    }
    externalProductUrl
`;

const guideDataMixin = `
    title
    ingress
    audience
    illustration {
        ${globalFragment}
        ${animatedIconsFragment.fragment}
    }
    externalProductUrl
`;

const themedArticleDataMixin = `
    title
    ingress
    taxonomy
    audience
    customCategory
    area
    illustration {
        ${globalFragment}
        ${animatedIconsFragment.fragment}
    }
    externalProductUrl
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
    situationDataMixin,
    guideDataMixin,
    themedArticleDataMixin,
};

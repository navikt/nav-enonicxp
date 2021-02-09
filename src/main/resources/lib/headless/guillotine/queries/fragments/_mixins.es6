const globalFragment = require('./_global');
const internalLink = require('./internalLink');
const externalLink = require('./externalLink');

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

const linkWithIngressMixinFragment = `
    ingress
    link {
        _selected
        internal {
            ${linkInternalMixinFragment}
        }
        external {
            ${linkExternalMixinFragment}
        }
    }
`;

const pageNavigationMenuMixinFragment = `
   anchorLinks(contentId:$ref) {
        anchorId
        linkText
    }
`;

module.exports = {
    linkPanelsMixinFragment,
    seoMixinFragment,
    linkInternalMixinFragment,
    linkExternalMixinFragment,
    linkWithIngressMixinFragment,
    pageNavigationMenuMixinFragment,
};

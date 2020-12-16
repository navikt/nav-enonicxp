const globalFragment = require('./_global');
const contentList = require('./contentList');
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

const contentListMixinFragment = `
    target {
        ${contentList.fragment}
    }
`;

module.exports = {
    linkPanelsMixinFragment,
    seoMixinFragment,
    linkInternalMixinFragment,
    linkExternalMixinFragment,
    linkWithIngressMixinFragment,
    contentListMixinFragment,
};

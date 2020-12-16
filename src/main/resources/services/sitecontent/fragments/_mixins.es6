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

module.exports = { linkPanelsMixinFragment, seoMixinFragment };

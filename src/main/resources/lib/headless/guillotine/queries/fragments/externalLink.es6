// const { permanentRedirectMixinFragment } = require('./_mixins');

const externalLinkFragment = `
    ...on no_nav_navno_ExternalLink {
        data {
            description
            url
            permanentRedirect
        }
    }
`;

module.exports = { fragment: externalLinkFragment };

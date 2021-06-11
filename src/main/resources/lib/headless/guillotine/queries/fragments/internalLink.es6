const globalFragment = require('./_global');
// const { permanentRedirectMixinFragment } = require('./_mixins');

const internalLinkFragment = `
    ...on no_nav_navno_InternalLink {
        data {
            description
            target {
                ${globalFragment}
            }
            permanentRedirect
        }
    }
`;

module.exports = { fragment: internalLinkFragment };

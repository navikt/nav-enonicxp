const globalFragment = require('./_global');

const internalLinkFragment = `
    ...on no_nav_navno_InternalLink {
        data {
            description
            target {
                ${globalFragment}
            }
            tempRedirect
        }
    }
`;

module.exports = { fragment: internalLinkFragment };

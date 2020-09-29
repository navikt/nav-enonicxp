const globalFragment = require('./_global');

const internalLinkFragment = `
    ...on no_nav_navno_InternalLink {
        data {
            target {
                ${globalFragment}
            }
        }
    }
`;

module.exports = internalLinkFragment;

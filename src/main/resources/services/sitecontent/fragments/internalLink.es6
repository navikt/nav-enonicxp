const internalLinkFragment = `
    ...on no_nav_navno_InternalLink {
        data {
            description
            target {
                _path
            }
        }
    }
`;

module.exports = internalLinkFragment;

const externalLinkFragment = `
    ...on no_nav_navno_ExternalLink {
        data {
            description
            url
        }
    }`;

module.exports = externalLinkFragment;

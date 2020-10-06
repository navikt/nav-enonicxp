const globalFragment = require('./_global');

const componentsFragment = `
    components {
        type
        path
        image {
            image {
                imageUrl(scale:"$scale", type:absolute)
            }
        }
        part {
            descriptor
            config {
                no_nav_navno{
                    link_panel_with_background {
                        title
                        description
                        background {
                            ${globalFragment}
                        }
                        target {
                            ${globalFragment}
                        }
                    }
                }
            }
        }
        text {
            value
        }
        fragment {
            id
            fragment {
                type
            }
        }
    }
`;

module.exports = componentsFragment;

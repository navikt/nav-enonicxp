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
                no_nav_navno {
                    dynamic_link_panel {
                        title
                        description
                        background {
                            dataAsJson
                            ${globalFragment}
                        }
                        target {
                            dataAsJson
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

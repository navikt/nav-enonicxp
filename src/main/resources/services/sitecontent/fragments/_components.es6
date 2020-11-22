const globalFragment = require('./_global');

const imageMediaUrlFragment = `
    ...on media_Vector {
        mediaUrl(download:false, type:absolute)
    }
    ...on media_Image {
        mediaUrl(download:false, type:absolute)
    }
`;

const dynamicPartsFragment = `
    config {
        no_nav_navno {
            dynamic_link_panel {
                title
                ingress
                icon {
                    ${imageMediaUrlFragment}
                }
                background {
                    ${imageMediaUrlFragment}
                }
                target {
                    ${globalFragment}
                }
            }
        }
    }
`;

const componentsFragment = `
    components(resolveTemplate:true) {
        type
        path
        page {
            descriptor
        }
        layout {
            descriptor
        }
        part {
            descriptor
            ${dynamicPartsFragment}
        }
        image {
            image {
                imageUrl(scale:"$scale", type:absolute)
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

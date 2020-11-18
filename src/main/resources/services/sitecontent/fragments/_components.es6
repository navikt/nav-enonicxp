const globalFragment = require('./_global');

const imageMediaUrlFragment = `
    ...on media_Vector {
        mediaUrl(download:false, type:absolute)
    }
    ...on media_Image {
        mediaUrl(download:false, type:absolute)
    }
`;

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
                        ingress
                        background {
                            dataAsJson
                            ${imageMediaUrlFragment}
                            ${globalFragment}
                        }
                        target {
                            dataAsJson
                            ${globalFragment}
                        }
                    }
                    dynamic_supervisor_panel {
                        content,
                        margin
                    }
                    dynamic_alert {
                        type
                        inline,
                        content,
                        margin
                    }
                    dynamic_read_more_panel {
                        ingress
                        content,
                        border,
                        margin
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

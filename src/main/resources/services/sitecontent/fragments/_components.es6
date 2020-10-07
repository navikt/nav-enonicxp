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
                    dynamic_link_panel {
                        title
                        description
                        background {
                            ${globalFragment}
                        }
                        target {
                            ${globalFragment}
                        }
                    }
                    dynamic_supervisor_panel {
                        content
                    }
                    dynamic_alert_panel {
                        type
                        content
                    }
                    dynamic_read_more_panel {
                        ingress
                        content
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

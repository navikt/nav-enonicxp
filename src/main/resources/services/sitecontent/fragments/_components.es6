const globalFragment = require('./_global');
const contentList = require('./contentList');

const imageMediaUrlFragment = `
    ...on media_Vector {
        mediaUrl(download:false, type:absolute)
    }
    ...on media_Image {
        mediaUrl(download:false, type:absolute)
    }
`;

const linkInternalMixinFragment = `
    target {
        ${globalFragment}
    }
    text
`;

const linkExternalMixinFragment = `
    url
    text
`;

const contentListMixinFragment = `
    numLinks
    target {
        ${contentList.fragment}
    }
`;

const linkWithIngressMixinFragment = `
    title
    ingress
    link {
        _selected
        internal {
            ${linkInternalMixinFragment}
        }
        external {
            ${linkExternalMixinFragment}
        }
    }
`;

const dynamicPartsFragment = `
    config {
        no_nav_navno {
            dynamic_header {
                title
                ingress
                titleTypo
            }
            dynamic_link_panel {
                ${linkWithIngressMixinFragment}
                vertical
                icon {
                    ${imageMediaUrlFragment}
                }
                background {
                    ${imageMediaUrlFragment}
                }
            }
            dynamic_supervisor_panel {
                content
                margin
            }
            dynamic_alert {
                type
                inline
                content
                margin
            }
            dynamic_read_more_panel {
                ingress
                content
                border
                margin
            }
            dynamic_link_list {
                title
                list {
                    _selected
                    contentList {
                        ${contentListMixinFragment}
                    }
                    linkList {
                        links {
                            _selected
                            external {
                                ${linkExternalMixinFragment}
                            }
                            internal {
                                ${linkInternalMixinFragment}
                            }
                        }
                    }
                }
            }
            dynamic_news_list {
                title
                contentList {
                    ${contentListMixinFragment}
                }
                moreNews {
                    url
                    text
                }
            }
        }
    }
`;

const componentsFragment = `
    components(resolveTemplate:true) {
        type
        path
        part {
            descriptor
            ${dynamicPartsFragment}
        }
        image {
            image {
                imageUrl(scale:"$scale", type:absolute)
            }
        }
    }
`;

module.exports = componentsFragment;

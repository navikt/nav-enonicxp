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

const contentListMixinFragment = `
    numLinks
    target {
        ${contentList.fragment}
    }
`;

const linksMixinFragment = `
    links {
        _selected
        external {
            url
            text
        }
        internal {
            target {
                ${globalFragment}
            }
            text
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
                        ${linksMixinFragment}
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

const { linkInternalMixinFragment } = require('./_mixins');
const { linkExternalMixinFragment } = require('./_mixins');
const { linkWithIngressMixinFragment } = require('./_mixins');
const contentListMixinFragment = require('./dangerous-mixins/content-list-mixin');
const { imageFragment } = require('./media');

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
                    ${imageFragment}
                }
                background {
                    ${imageFragment}
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
            html_area {
                html(processHtml:{type: absolute})
            }
            page_navigation_menu {
                anchorLinks(contentId:$ref) {
                    anchorId
                    linkText
                }
            }
        }
    }
`;

const componentsFragment = `
    components(resolveTemplate: true, resolveFragment: true) {
        type
        path
        part {
            descriptor
            ${dynamicPartsFragment}
        }
        layout {
            descriptor
            configAsJson
        }
        image {
            image {
                imageUrl(scale: "$scale", type: absolute)
            }
        }
    }
`;

module.exports = componentsFragment;

const {
    linkWithIngressMixinFragment,
    linkSelectableMixin,
    pageNavigationMenuMixinFragment,
} = require('./_mixins');
const { imageFragment } = require('./media');
const contentListMixinFragment = require('./dangerous-mixins/content-list-mixin');

const partsFragment = `
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
                            ${linkSelectableMixin}
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
                html(processHtml:{type: server})
            }
            page_header {
                pageHeader
            }
            button {
                icon {
                    ${imageFragment}
                }
                link {
                    ${linkSelectableMixin}
                }
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

const pagesFragment = `
    config {
        no_nav_navno {
            page_with_side_menus {
               ${pageNavigationMenuMixinFragment}
            }
        }
    }
`;

const componentsContent = `
    type
    path
    page {
        descriptor
        configAsJson
        ${pagesFragment}
    }
    layout {
        descriptor
        configAsJson
    }
    part {
        descriptor
        configAsJson
        ${partsFragment}
    }
    image {
        image {
            imageUrl(scale: "$scale", type: absolute)
        }
    }
`;

// We have to resolve and handle fragments ourselves, as using resolveFragment: true
// crashes the content studio editor...
// ("fragment" is an overloaded term here, the "fragment" fields inside this query-fragment
// refers to the fragment component type)
const componentsFragment = `
    components(resolveTemplate: true, resolveFragment: false) {
        ${componentsContent}
        fragment {
            fragment {
                components(resolveTemplate: true, resolveFragment: false){
                    ${componentsContent}
                }
            }
        }
    }
`;

module.exports = componentsFragment;

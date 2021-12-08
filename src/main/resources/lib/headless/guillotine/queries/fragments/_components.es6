const {
    linkWithIngressMixinFragment,
    linkSelectableMixin,
    pageNavigationMenuMixinFragment,
    headerCommonMixin,
} = require('./_mixins');
const { imageFragment } = require('./media');
const contentListMixinFragment = require('./dangerous-mixins/content-list-mixin');
const {
    productTargetMixin,
} = require('/lib/headless/guillotine/queries/fragments/dangerous-mixins/product-target-mixin');
const {
    calculatorTargetMixin,
} = require('/lib/headless/guillotine/queries/fragments/dangerous-mixins/calculator-target-mixin');
const { processedHtmlFragment } = require('./_processedHtml');

const contactInformationFragment = require('./contactInformation');

const partsFragment = `
    config {
        no_nav_navno {
            dynamic_header {
                title
                anchorId
                hideFromInternalNavigation
                ${headerCommonMixin}
            }
            dynamic_link_panel {
                ${linkWithIngressMixinFragment}
                icon {
                    ${imageFragment}
                }
                background {
                    ${imageFragment}
                }
            }
            dynamic_alert {
                type
                size
                inline
                content ${processedHtmlFragment}
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
                filters
                html ${processedHtmlFragment}
            }
            page_header {
                title
            }
            button {
                icon {
                    ${imageFragment}
                }
                link {
                    ${linkSelectableMixin}
                }
            }
            page_header {
                title
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
            filters_menu {
                title
                description
                categories {
                    categoryName
                    filters {
                        filterName
                        id
                    }
                }
            }
            product_card {
                ingressOverride
                ${productTargetMixin}
            }
            product_card_micro {
                card_list {
                    ${productTargetMixin}
                }
            }
            product_card_mini {
                ${productTargetMixin}
            }
            calculator {
                ${calculatorTargetMixin}
            }
            contact_option {
                contactOptions {
                    _selected
                    chat {
                        ingress
                    }
                    write {
                        ingress
                        title
                        url
                    }
                    call {
                        ingress
                        sharedContactInformation {
                            ${contactInformationFragment.fragment}
                        }
                    }
                }
            }
        }
    }
`;

const layoutsFragment = `
    config {
        no_nav_navno {
            section_with_header {
                anchorId
                hideFromInternalNavigation
                icon {
                    color
                    size
                    icon {
                        ${imageFragment}
                    }
                }
            }
            situation_flex_cols {
                hideFromInternalNavigation
                anchorId
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
        ${layoutsFragment}
    }
    part {
        descriptor
        configAsJson
        ${partsFragment}
    }
    image {
        image {
            imageUrl(scale: "$scale", type: server)
        }
    }
`;

// We have to resolve and handle fragments ourselves, as the structure generated by
// using resolveFragment: true crashes the content studio editor...
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

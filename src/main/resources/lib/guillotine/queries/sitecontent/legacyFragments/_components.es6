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
} = require('/lib/guillotine/queries/sitecontent/legacyFragments/dangerous-mixins/product-target-mixin');
const {
    calculatorTargetMixin,
} = require('/lib/guillotine/queries/sitecontent/legacyFragments/dangerous-mixins/calculator-target-mixin');
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
                        phoneNumber
                        sharedContactInformation {
                            ${contactInformationFragment.fragment}
                        }
                    }
                    custom {
                        ingress
                        icon
                        title
                        url
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

const _componentsFragment = `
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

const componentsFragment = `
    components(resolveTemplate: true, resolveFragment: false) {
        ${_componentsFragment}
        fragment {
            id    
        }
    }
`;

const fragmentComponentsFragment = `
    components(resolveTemplate: true, resolveFragment: true) {
        ${_componentsFragment}
    }
    nestedFragments: components(resolveTemplate: true, resolveFragment: false) {
        path
        type
    }
`;

module.exports = { componentsFragment, fragmentComponentsFragment };

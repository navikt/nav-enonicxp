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
    productDetailsTargetMixin,
} = require('/lib/headless/guillotine/queries/fragments/dangerous-mixins/product-details-target-mixin');
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
            product_details {
                ${productDetailsTargetMixin}
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

// This is used for resolving components. The resolveFragment arg does not work correctly with nested fragments
// (ie. a part inside a layout-fragment region), so we have to resolve fragments separately. ("Fragment" is an
// overloaded term here, meaning both a GraphQL query fragment and an XP fragment component type ¯\_(ツ)_/¯)
// We include fragment.id in this query so we can do followup queries for resolving fragments
const componentsFragment = `
    components(resolveTemplate: true, resolveFragment: false) {
        ${_componentsFragment}
        fragment {
            id    
        }
    }
`;

// This is used for components in the portal:fragment type. Because this type can only have one level of nesting, the
// resolveFragment bug does not affect us here. We include a list of unresolved types, as nested fragments need to be
// tagged with fragment attributes in order to enable editing such fragments in the content studio editor
const fragmentComponentsFragment = `
    components(resolveTemplate: true, resolveFragment: true) {
        ${_componentsFragment}
    }
    unresolvedComponentTypes: components(resolveTemplate: true, resolveFragment: false) {
        path
        type
    }
`;

module.exports = { componentsFragment, fragmentComponentsFragment };

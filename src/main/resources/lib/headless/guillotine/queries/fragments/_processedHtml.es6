const { productTargetMixin } = require('./dangerous-mixins/product-target-mixin');
const { linkExternalMixinFragment } = require('./_mixins');
const { linkInternalMixinFragment } = require('./_mixins');

const macrosFragment = `
    name
    ref
    config {
        button {
            text
            url
            content {
                _path
            }
        }
        button_blue {
            text
            url
            content {
                _path
            }
        }
        chatbot_link {
            text
        }
        chevron_link_external {
            ${linkExternalMixinFragment}
        }
        chevron_link_internal {
            ${linkInternalMixinFragment}
        }
        fotnote {
            fotnote
        }
        global_value {
            value
        }
        global_value_with_math {
            decimals
            expression
            variables
        }
        header_with_anchor {
            text
            body
            id
            tag
        }
        infoBoks {
            infoBoks
        }
        ingress {
            body
        }
        lenkeFiler {
            text
            files {
                _path
            }
        }
        phone_link {
            text
            phoneNumber
            chevron
        }
        product_card_mini {
            ${productTargetMixin}
        }
        quote {
            quote
        }
        varselBoks {
            varselBoks
        }
        video {
            title
            video
        }
    }
`;

// html_fragment is a macro which points to fragments of the html-area part
// This is handled separately from other macros to prevent circular references
const processedHtmlFragment = `(processHtml:{type:server}) {
    processedHtml
    macros {
        ${macrosFragment}
        config {
            html_fragment {
                fragmentId
                processedHtml {
                    processedHtml
                    macros {
                        ${macrosFragment}
                    }
                }
            }
            alert_box {
                type
                size
                body
            }
        }
    }
}`;

module.exports = { processedHtmlFragment };

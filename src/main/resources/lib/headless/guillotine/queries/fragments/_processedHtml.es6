const { linkExternalMixinFragment } = require('/lib/headless/guillotine/queries/fragments/_mixins');
const { linkInternalMixinFragment } = require('/lib/headless/guillotine/queries/fragments/_mixins');

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
        header_with_anchor {
            text
            id
            tag
        }
        infoBoks {
            infoBoks
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
        }
    }
}`;

module.exports = { processedHtmlFragment };

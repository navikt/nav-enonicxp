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
        global_value {
            value
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

const processedHtmlFragment = `(processHtml:{type:server}) {
        processedHtml
        macros {
            ${macrosFragment}
        }
    }
`;

module.exports = { processedHtmlFragment };

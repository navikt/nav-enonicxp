const globalFragment = require('./_global');
const menuListItems = require('./menuListItems');
const { seoMixinFragment } = require('./_mixins');

const mainArticleContentFragment = `
    ${globalFragment}
    data {
        ingress
        text(processHtml:{type:absolute})
        hasTableOfContents
        fact(processHtml:{type:absolute})
        social
        picture {
            target {
                ...on media_Image {
                     mediaUrl(download: false, type:absolute)
                }
                ...on media_Vector {
                     mediaUrl(download: false, type:absolute)
                }
            }
            size
            caption
            altText
        }
        ${menuListItems.fragment}
        ${seoMixinFragment}
    }
`;

module.exports = { fragment: mainArticleContentFragment };

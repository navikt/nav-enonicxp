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
                     imageUrl(scale:"$scale", type:absolute)
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

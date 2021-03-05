const globalFragment = require('./_global');
const menuListItems = require('./menuListItems');
const { seoMixinFragment } = require('./_mixins');

const mainArticleContentFragment = `
    ${globalFragment}
    data {
        languages {
            language
            _path
            _id
        }
        ingress
        text(processHtml:{type:server})
        hasTableOfContents
        fact(processHtml:{type:server})
        social
        picture {
            target {
                __typename
                ...on media_Image {
                     imageUrl(scale:"$scale", type:server)
                }
                ...on media_Vector {
                     mediaUrl(download: false, type:server)
                }
            }
            size
            caption
            altText
        }
        feedbackToggle
        ${menuListItems.fragment}
        ${seoMixinFragment}
    }
`;

module.exports = { fragment: mainArticleContentFragment };

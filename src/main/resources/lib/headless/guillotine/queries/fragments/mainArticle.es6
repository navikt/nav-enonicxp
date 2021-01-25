const globalFragment = require('./_global');
const menuListItems = require('./menuListItems');
const { seoMixinFragment } = require('./_mixins');

const mainArticleFragment = `
    ...on no_nav_navno_MainArticle {
        ${globalFragment}
        data {
            languages {
                language
                _path
                _id
            }
            ingress
            text(processHtml:{type:absolute})
            hasTableOfContents
            fact(processHtml:{type:absolute})
            social
            picture {
                target {
                    __typename
                    ...on media_Image {
                         imageUrl(scale:"$scale", type:absolute)
                    }
                    ...on media_Vector {
                         mediaUrl(download: false, type:absolute)
                    }
                }
                size
                caption
                altText
            }
            chapters {
                ${globalFragment}
            }
            ${menuListItems.fragment}
            ${seoMixinFragment}
        }
    }
`;

const mainArticleShortFragment = `
    ...on no_nav_navno_MainArticle {
        data {
            ingress
        }
    }
`;

module.exports = { fragment: mainArticleFragment, shortFragment: mainArticleShortFragment };

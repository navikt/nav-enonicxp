const globalFragment = require('./_global');
const menuListItems = require('./menuListItems');
const { decoratorTogglesMixinFragment } = require('./_mixins');
const { languagesMixinFragment } = require('./_mixins');
const { imageFragment } = require('./media');
const { seoMixinFragment } = require('./_mixins');

const mainArticleFragment = `
    ...on no_nav_navno_MainArticle {
        ${globalFragment}
        data {
            ${languagesMixinFragment}
            ingress
            text(processHtml:{type:server})
            hasTableOfContents
            fact(processHtml:{type:server})
            social
            picture {
                target {
                    ${imageFragment}
                }
                size
                caption
                altText
            }
            chapters {
                ${globalFragment}
            }
            ${decoratorTogglesMixinFragment}
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

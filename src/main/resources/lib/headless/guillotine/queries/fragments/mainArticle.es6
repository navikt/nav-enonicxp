const globalFragment = require('./_global');
const menuListItems = require('./menuListItems');
const {
    processedHtmlMixin,
    decoratorTogglesMixinFragment,
    languagesMixinFragment,
    seoMixinFragment,
} = require('./_mixins');
const { imageFragment } = require('./media');

const mainArticleFragment = `
    ...on no_nav_navno_MainArticle {
        ${globalFragment}
        data {
            ${languagesMixinFragment}
            ingress
            text ${processedHtmlMixin}
            hasTableOfContents
            fact ${processedHtmlMixin}
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

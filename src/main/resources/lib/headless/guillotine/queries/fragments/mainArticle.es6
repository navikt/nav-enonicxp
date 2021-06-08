const globalFragment = require('./_global');
const menuListItems = require('./menuListItems');
const { processedHtmlFragment } = require('./_processedHtml');
const {
    decoratorTogglesMixinFragment,
    languagesMixinFragment,
    seoMixinFragment,
} = require('./_mixins');
const { imageFragment } = require('./media');

const mainArticleFragment = `
    ...on no_nav_navno_MainArticle {
        ${globalFragment}
        data {
            customPath
            ${languagesMixinFragment}
            ingress
            text ${processedHtmlFragment}
            hasTableOfContents
            fact ${processedHtmlFragment}
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

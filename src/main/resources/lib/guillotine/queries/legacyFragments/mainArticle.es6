const globalFragment = require('./_global');
const menuListItems = require('./menuListItems');
const { processedHtmlFragment } = require('./_processedHtml');
const {
    decoratorTogglesMixinFragment,
    languagesMixinFragment,
    seoMixinFragment,
} = require('./_mixins');
const { imageFragment } = require('./media');
const {
    mainArticleChapterMenuDataMixin,
} = require('./dangerous-mixins/mainArticleChapterMenuDataMixin');

const mainArticleFragment = `
    ...on no_nav_navno_MainArticle {
        data {
            social
            ingress
            hasTableOfContents
            ${languagesMixinFragment}
            text ${processedHtmlFragment}
            fact ${processedHtmlFragment}
            picture {
                target {
                    ${imageFragment}
                }
                size
                caption
                altText
            }
            chapters {
                ${mainArticleChapterMenuDataMixin}
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

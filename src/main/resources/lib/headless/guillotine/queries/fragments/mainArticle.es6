const globalFragment = require('./_global');
const mainArticleContent = require('./mainArticleContent');

const mainArticleFragment = `
    ...on no_nav_navno_MainArticle {
        ${mainArticleContent.fragment}
        children(first:1000) {
            ...on no_nav_navno_MainArticleChapter {
                ${globalFragment}
            }
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

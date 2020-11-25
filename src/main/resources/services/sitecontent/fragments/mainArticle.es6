const mainArticleContent = require('./mainArticleContent');
const mainArticleChapter = require('./mainArticleChapter');

const mainArticleFragment = `
    ...on no_nav_navno_MainArticle {
        ${mainArticleContent.fragment}
        children {
            ${mainArticleChapter.fragment}
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

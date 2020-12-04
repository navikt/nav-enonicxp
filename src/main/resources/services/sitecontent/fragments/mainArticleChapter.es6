const globalFragment = require('./_global');
const mainArticleContent = require('./mainArticleContent');

const mainArticleChapterFragment = `
    ...on no_nav_navno_MainArticleChapter {
        ${globalFragment}
        parent{
            ${globalFragment}
            children(first:1000) {
                ${globalFragment}
            }
        }
        data {
            article {
               ...on no_nav_navno_MainArticle {
                   ${mainArticleContent.fragment}
               }
            }
        }
    }
`;

module.exports = { fragment: mainArticleChapterFragment };

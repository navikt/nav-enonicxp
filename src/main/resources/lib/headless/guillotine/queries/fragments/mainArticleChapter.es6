const globalFragment = require('./_global');
const mainArticleContent = require('./mainArticleContent');

const mainArticleChapterFragment = `
    ...on no_nav_navno_MainArticleChapter {
        ${globalFragment}
        parent {
            ${globalFragment}
            children(first:1000) {
                ...on no_nav_navno_MainArticleChapter {
                    ${globalFragment}
                }
            }
        }
        data {
            languages {
                language
                _path
                _id
            }
            article {
               ...on no_nav_navno_MainArticle {
                   ${mainArticleContent.fragment}
               }
            }
        }
    }
`;

module.exports = { fragment: mainArticleChapterFragment };

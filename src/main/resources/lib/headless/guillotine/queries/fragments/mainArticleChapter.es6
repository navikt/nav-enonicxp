const globalFragment = require('./_global');
const mainArticle = require('./mainArticle');

const mainArticleChapterFragment = `
    ...on no_nav_navno_MainArticleChapter {
        ${globalFragment}
        parent {
            ...on no_nav_navno_MainArticle {
                ${globalFragment}
                data {
                    chapters {
                        ${globalFragment}
                    }
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
                ${globalFragment}
                ${mainArticle.fragment}
            }
        }
    }
`;

module.exports = { fragment: mainArticleChapterFragment };

const globalFragment = require('../_global');

// Put this in a separate file to prevent circular dependencies between the
// mainArticle and mainArticleChapter files

const mainArticleChapterMenuDataMixin = `
    ${globalFragment}
    ...on no_nav_navno_MainArticleChapter {
        data {
            article {
                ${globalFragment}
            }
        }
    }
`;

module.exports = { mainArticleChapterMenuDataMixin };

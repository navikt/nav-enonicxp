const globalFragment = require('../_global');

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

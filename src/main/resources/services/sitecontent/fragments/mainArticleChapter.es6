const globalFragment = require('./_global');

const mainArticleChapterFragment = `
    ...on no_nav_navno_MainArticleChapter {
        ${globalFragment}
        parent{
            ${globalFragment}
            children{
                ${globalFragment}
            }
        }
        dataAsJson
    }
`;

module.exports = { fragment: mainArticleChapterFragment };

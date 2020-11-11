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
        data {
            article {
               ...on no_nav_navno_MainArticle {
               data {
                   contentType
                   hasTableOfContents
                   ingress
                   text(processHtml:{type:absolute})
               }
            }
        }
        publish {
            from
        }
        language
    }
`;

module.exports = { fragment: mainArticleChapterFragment };

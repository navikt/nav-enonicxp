const globalFragment = require('./_global');
const pageList = require('./pageList');
const transportPage = require('./transportPage');
const mainArticle = require('./mainArticle');

const contentListFragment = `
    ...on no_nav_navno_ContentList {
        data {
            sectionContents {
                ${globalFragment}
                ${pageList.shortFragment}
                ${transportPage.shortFragment}
                ${mainArticle.shortFragment}
            }
        }
    }
`;

module.exports = { fragment: contentListFragment };

const globalFragment = require('./_global.es6');
const pageList = require('./pageList.es6');
const transportPage = require('./transportPage.es6');
const mainArticle = require('./mainArticle.es6');

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

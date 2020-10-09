const globalFragment = require('./_global.es6');
const contentListFragment = require('./contentList.es6');
const externalLinkFragment = require('./externalLink.es6');
const pageList = require('./pageList.es6');
const mainArticle = require('./mainArticle.es6');
const transportPage = require('./transportPage.es6');

const sectionPageFragment = `
    ...on no_nav_navno_SectionPage {
        dataAsJson
        data {
            tableContents {
                ${globalFragment}
                ${externalLinkFragment}
                ${pageList.shortFragment}
                ${transportPage.shortFragment}
                ${mainArticle.shortFragment}
            }
            newsContents {
                ${globalFragment}
                ${contentListFragment}
            }
            ntkContents {
                ${globalFragment}
                ${contentListFragment}
            }
            scContents {
                ${globalFragment}
                ${contentListFragment}
            }
        }
    }
`;

module.exports = { fragment: sectionPageFragment };

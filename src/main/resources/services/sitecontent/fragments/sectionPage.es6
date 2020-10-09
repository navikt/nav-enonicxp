const globalFragment = require('./_global.es6');
const contentList = require('./contentList.es6');
const externalLink = require('./externalLink.es6');
const pageList = require('./pageList.es6');
const mainArticle = require('./mainArticle.es6');
const transportPage = require('./transportPage.es6');

const sectionPageFragment = `
    ...on no_nav_navno_SectionPage {
        dataAsJson
        data {
            tableContents {
                ${globalFragment}
                ${externalLink.fragment}
                ${pageList.shortFragment}
                ${transportPage.shortFragment}
                ${mainArticle.shortFragment}
            }
            newsContents {
                ${globalFragment}
                ${contentList.fragment}
            }
            ntkContents {
                ${globalFragment}
                ${contentList.fragment}
            }
            scContents {
                ${globalFragment}
                ${contentList.fragment}
            }
        }
    }
`;

module.exports = { fragment: sectionPageFragment };

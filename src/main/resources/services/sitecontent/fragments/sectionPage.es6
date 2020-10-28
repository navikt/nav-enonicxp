const globalFragment = require('./_global');
const contentList = require('./contentList');
const externalLink = require('./externalLink');
const pageList = require('./pageList');
const mainArticle = require('./mainArticle');
const transportPage = require('./transportPage');

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

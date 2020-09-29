const globalFragment = require('./_global.es6');
const contentListFragment = require('./contentList.es6');
const transportPageFragment = require('./transportPage.es6');
const externalLinkFragment = require('./externalLink.es6');
const pageListFragment = require('./pageList.es6');
const mainArticleFragment = require('./mainArticle.es6');

const sectionPageFragment = `
    ...on no_nav_navno_SectionPage {
        dataAsJson
        data {
            ingress
            nrTableEntries
            panelsHeading
            tableContents {
                ${globalFragment}
                ${transportPageFragment}
                ${externalLinkFragment}
                ${pageListFragment}
                ${mainArticleFragment}
            }
            nrNews
            newsContents {
                ${globalFragment}
                ${contentListFragment}
            }
            moreNewsUrl
            nrNTK
            ntkContents {
                ${globalFragment}
                ${contentListFragment}
            }
            nrSC
            scContents {
                ${globalFragment}
                ${contentListFragment}
            }
        }
    }`;

module.exports = sectionPageFragment;

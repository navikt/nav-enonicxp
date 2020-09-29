const globalFragment = require('./_global.es6');
const contentListFragment = require('./contentList.es6');
const transportPageFragment = require('./transportPage.es6');
const externalLinkFragment = require('./externalLink.es6');
const pageListFragment = require('./pageList.es6');
const mainArticleFragment = require('./mainArticle.es6');

const sectionPageFragment = `
    ...on no_nav_navno_SectionPage {
        data {
            tableContents {
                ${globalFragment}
                ${transportPageFragment}
                ${externalLinkFragment}
                ${pageListFragment}
                ${mainArticleFragment}
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

module.exports = sectionPageFragment;

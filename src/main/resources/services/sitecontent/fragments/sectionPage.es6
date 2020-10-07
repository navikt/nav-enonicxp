const globalFragment = require('./_global.es6');
const contentListFragment = require('./contentList.es6');
const externalLinkFragment = require('./externalLink.es6');
const pageListFragment = require('./pageList.es6');
const mainArticleShortFragment = require('./mainArticleShort.es6');
const transportPageShortFragment = require('./transportPageShort.es6');

const sectionPageFragment = `
    ...on no_nav_navno_SectionPage {
        dataAsJson
        data {
            tableContents {
                ${globalFragment}
                ${externalLinkFragment}
                ${pageListFragment}
                ${transportPageShortFragment}
                ${mainArticleShortFragment}
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

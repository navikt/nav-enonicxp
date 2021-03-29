const globalFragment = require('./_global');
const pageList = require('./pageList');
const transportPage = require('./transportPage');
const mainArticle = require('./mainArticle');
const internalLink = require('./internalLink');
const externalLink = require('./externalLink');
const urlFragment = require('./url');

const contentListFragment = `
    ...on no_nav_navno_ContentList {
        data {
            sortedBy
            sectionContents {
                ${globalFragment}
                ${pageList.shortFragment}
                ${transportPage.shortFragment}
                ${mainArticle.shortFragment}
                ${internalLink.fragment}
                ${externalLink.fragment}
                ${urlFragment.fragment}
            }
        }
    }
`;

module.exports = {
    fragment: contentListFragment,
};

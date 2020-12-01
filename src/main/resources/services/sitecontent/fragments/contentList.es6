const globalFragment = require('./_global');
const pageList = require('./pageList');
const transportPage = require('./transportPage');
const mainArticle = require('./mainArticle');
const internalLink = require('./internalLink');
const externalLink = require('./externalLink');

const contentListFragment = (sort) => `
    ...on no_nav_navno_ContentList {
        data {
            sectionContents${sort ? `(sort:"${sort}")` : ''} {
                ${globalFragment}
                ${pageList.shortFragment}
                ${transportPage.shortFragment}
                ${mainArticle.shortFragment}
                ${internalLink.fragment}
                ${externalLink.fragment}
            }
        }
    }
`;

module.exports = {
    fragment: contentListFragment(),
    fragmentSortedDateDesc: contentListFragment('modifiedTime DESC'),
};

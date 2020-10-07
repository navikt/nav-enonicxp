const globalFragment = require('./_global.es6');
const transportPageShortFragment = require('./transportPageShort.es6');
const mainArticleShortFragment = require('./mainArticleShort.es6');

const contentListFragment = `
    ...on no_nav_navno_ContentList {
        data {
            sectionContents {
                ${globalFragment}
                ${transportPageShortFragment}
                ${mainArticleShortFragment}
            }
        }
    }
`;

module.exports = contentListFragment;

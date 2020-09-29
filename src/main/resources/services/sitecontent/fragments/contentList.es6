const globalFragment = require('./_global.es6');

const contentListFragment = `
    ...on no_nav_navno_ContentList {
        data {
            sectionContents {
                ${globalFragment}
            }
        }
    }
`;

module.exports = contentListFragment;

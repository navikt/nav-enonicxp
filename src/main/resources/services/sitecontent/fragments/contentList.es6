const globalFragment = require('./global');

const contentListFragment = `
    ...on no_nav_navno_ContentList {
        data {
            sectionContents {
                ${globalFragment}
            }
        }
    }`;

module.exports = contentListFragment;

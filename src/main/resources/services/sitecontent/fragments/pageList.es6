const globalFragment = require('./_global.es6');

const pageListFragment = `
    ...on no_nav_navno_PageList {
        data {
            ingress
            sectionContents {
                ${globalFragment}
            }
        }
    }`;

module.exports = pageListFragment;

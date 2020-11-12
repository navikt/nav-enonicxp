const globalFragment = require('./_global');

const pageListFragment = `
    ...on no_nav_navno_PageList {
        dataAsJson
        data {
            sectionContents {
                ${globalFragment}
            }
            menuListItems {
                _selected
                shortcuts {
                    link {
                        ${globalFragment}
                    }
                }
            }
        }
    }
`;

const pageListShortFragment = `
    ...on no_nav_navno_PageList {
        data {
            ingress
        }
    }
`;

module.exports = { fragment: pageListFragment, shortFragment: pageListShortFragment };
